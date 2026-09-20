import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createPublicClient, http, isAddress, verifyMessage } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { robinhoodTestnet } from '@alchemy/common/chains';
import { createBundlerClient, createPaymasterClient } from 'viem/account-abstraction';
import { DefaultModuleAddress, NativeTokenLimitModule, toModularAccountV2 } from '@alchemy/smart-accounts';
import { evaluatePayment } from '../frontend/policy-engine.js';
import { paymentApprovalMessage, policyIdentifier, policyRegistrationMessage } from '../frontend/policy-auth.js';

const root = new URL('../', import.meta.url);
const readText = path => readFileSync(path, 'utf8').trim();
const readEnv = key => {
  if (process.env[key]) return process.env[key].trim();
  const envPath = new URL('.env.local', root);
  if (!existsSync(envPath)) return '';
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find(item => item.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
};
const secretPath = new URL('.agent-key.local', root);
const apiTokenPath = new URL('.agent-api-token.local', root);
const ownerPath = new URL('.owner-address.local', root);
const ledgerPath = new URL('.agent-ledger.local.json', root);
const ledgerTempPath = new URL('.agent-ledger.local.tmp', root);
const identity = JSON.parse(readFileSync(new URL('frontend/agent-identity.json', root), 'utf8'));
const service = JSON.parse(readFileSync(new URL('frontend/demo-service.json', root), 'utf8'));
const signer = privateKeyToAccount(readText(secretPath));
const agentApiToken = readEnv('AGENT_SERVICE_TOKEN') || (() => {
  if (!existsSync(apiTokenPath)) writeFileSync(apiTokenPath, `${randomBytes(32).toString('hex')}\n`);
  return readText(apiTokenPath);
})();
const apiKey = readEnv('VITE_ALCHEMY_API_KEY');
const gasPolicyId = readEnv('VITE_ALCHEMY_GAS_POLICY_ID');

const networks = {
  421614: { chain: arbitrumSepolia, name: 'Arbitrum Sepolia', rpc: 'https://sepolia-rollup.arbitrum.io/rpc', bundler: 'https://api.candide.dev/public/v3/arbitrum-sepolia', policyPath: new URL('.policy-state.local.json', root), mode: 'candide' },
  46630: { chain: robinhoodTestnet, name: 'Robinhood Chain Testnet', rpc: 'https://rpc.testnet.chain.robinhood.com', bundler: `https://robinhood-testnet.g.alchemy.com/v2/${apiKey}`, policyPath: new URL('.robinhood-policy-state.local.json', root), mode: 'alchemy' }
};
const readJson = (path, fallback) => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
const writeJson = (path, value) => {
  if (path === ledgerPath) {
    writeFileSync(ledgerTempPath, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(ledgerTempPath, ledgerPath);
  } else writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const policyFor = chainId => networks[Number(chainId)]?.policyPath;
const respond = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json', 'cache-control': 'no-store',
    'access-control-allow-origin': 'http://127.0.0.1:4173',
    'access-control-allow-headers': 'content-type,x-agent-session,authorization',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(body));
};
const bodyJson = req => new Promise((resolve, reject) => {
  let body = '';
  let rejected = false;
  req.on('data', chunk => {
    if (rejected) return;
    body += chunk;
    if (Buffer.byteLength(body) > 100_000) { rejected = true; reject(new Error('Request too large')); req.destroy(); }
  });
  req.on('end', () => {
    if (rejected) return;
    try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Request body must be valid JSON.')); }
  });
  req.on('error', reject);
});

const challenges = new Map();
const sessions = new Map();
const ownerSessionMessage = ({ ownerAddress, nonce, expiresAt }) => [
  'Manda owner session', 'Version: 1', `Owner: ${ownerAddress.toLowerCase()}`, `Nonce: ${nonce}`, `Expires: ${expiresAt}`
].join('\n');
const createSession = ownerAddress => {
  const session = { token: randomBytes(32).toString('hex'), ownerAddress, expiresAt: Date.now() + 30 * 60_000 };
  sessions.set(session.token, session);
  return session;
};
const sessionFor = req => {
  const token = req.headers['x-agent-session'];
  const session = typeof token === 'string' ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) return null;
  return session;
};
const bearerAuthorized = req => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') && header.slice(7) === agentApiToken;
};
const requestAuthorized = (req, policy) => bearerAuthorized(req)
  || sessionFor(req)?.ownerAddress.toLowerCase() === policy.ownerAddress?.toLowerCase();

function normalizedPolicy(policy) {
  if (!policy || typeof policy !== 'object') throw new Error('Policy is required.');
  policy = {
    ...policy,
    approvalThresholdWei: policy.approvalThresholdWei || (BigInt(policy.perPaymentWei) / 4n).toString(),
    balanceFloorWei: policy.balanceFloorWei || '1000000000000000'
  };
  for (const field of ['ownerAddress', 'agentAddress', 'smartAccount', 'recipient']) {
    if (!isAddress(policy[field] || '')) throw new Error(`${field} must be a valid address.`);
  }
  const trustedOwner = existsSync(ownerPath) ? readText(ownerPath) : '';
  if (trustedOwner && policy.ownerAddress.toLowerCase() !== trustedOwner.toLowerCase()) throw new Error('This service is pinned to another owner.');
  if (policy.agentAddress.toLowerCase() !== signer.address.toLowerCase()) throw new Error('Agent identity mismatch.');
  if (!networks[Number(policy.chainId)]) throw new Error(`Unsupported chain ${policy.chainId}.`);
  if (!Number.isInteger(Number(policy.entityId)) || Number(policy.entityId) < 0) throw new Error('Invalid policy entity.');
  for (const field of ['perPaymentWei', 'dailyLimitWei', 'approvalThresholdWei', 'balanceFloorWei']) {
    try { if (BigInt(policy[field]) < 0n) throw new Error(); } catch { throw new Error(`${field} must be a non-negative integer.`); }
  }
  if (BigInt(policy.perPaymentWei) <= 0n || BigInt(policy.dailyLimitWei) <= 0n) throw new Error('Payment and daily limits must be positive.');
  if (BigInt(policy.perPaymentWei) > BigInt(policy.dailyLimitWei)) throw new Error('Per-payment limit cannot exceed the daily budget.');
  if (BigInt(policy.approvalThresholdWei) > BigInt(policy.perPaymentWei)) throw new Error('Approval threshold cannot exceed the payment cap.');
  if (!['active', 'revoked'].includes(policy.status)) throw new Error('Policy status is invalid.');
  if (policy.status === 'active' && Number(policy.expiresAt) <= Date.now()) throw new Error('Policy has already expired.');
  const result = {
    ...policy, chainId: Number(policy.chainId), entityId: Number(policy.entityId),
    onchainAllowanceWei: String(policy.onchainAllowanceWei || policy.dailyLimitWei)
  };
  result.policyId = policyIdentifier(result);
  return result;
}

async function verifyPolicyEvidence(policy) {
  const network = networks[policy.chainId];
  const client = createPublicClient({ chain: network.chain, transport: http(network.rpc) });
  const [code, receipt] = await Promise.all([
    client.getCode({ address: policy.smartAccount }),
    client.getTransactionReceipt({ hash: policy.transactionHash })
  ]);
  if (!code || code === '0x') throw new Error('Smart account is not deployed on the selected chain.');
  if (receipt.status !== 'success') throw new Error('Policy evidence transaction did not succeed.');
  if (policy.status === 'active') {
    const remaining = await client.readContract({
      address: DefaultModuleAddress.NATIVE_TOKEN_LIMIT, abi: NativeTokenLimitModule.abi,
      functionName: 'limits', args: [BigInt(policy.entityId), policy.smartAccount]
    });
    if (remaining <= 0n || remaining > BigInt(policy.onchainAllowanceWei)) throw new Error('Onchain allowance does not match the signed policy.');
  }
}

async function verifyPaymentApproval(policy, request) {
  const threshold = BigInt(policy.approvalThresholdWei || 0);
  let amount;
  try { amount = BigInt(request.amountWei); } catch { return false; }
  if (amount <= threshold) return false;
  const approval = request.approval;
  if (!approval?.signature || !Number.isFinite(Number(approval.expiresAt))) return false;
  const expiresAt = Number(approval.expiresAt);
  if (expiresAt <= Date.now() || expiresAt > Date.now() + 10 * 60_000) return false;
  return verifyMessage({ address: policy.ownerAddress, message: paymentApprovalMessage(policy, request, expiresAt), signature: approval.signature });
}

async function executePayment(policy, request) {
  const network = networks[policy.chainId];
  const publicClient = createPublicClient({ chain: network.chain, transport: http(network.rpc) });
  const agentAccount = await toModularAccountV2({
    client: publicClient, owner: signer,
    signerEntity: { isGlobalValidation: false, entityId: policy.entityId }, accountAddress: policy.smartAccount
  });
  const transport = network.mode === 'alchemy'
    ? http(network.bundler, { fetchOptions: { headers: { 'x-alchemy-policy-id': gasPolicyId } } }) : http(network.bundler);
  const options = { account: agentAccount, chain: network.chain, transport, userOperation: { estimateFeesPerGas: () => publicClient.estimateFeesPerGas() } };
  if (network.mode === 'candide') options.paymaster = createPaymasterClient({ chain: network.chain, transport });
  const bundler = createBundlerClient(options);
  const call = { to: request.recipient, value: BigInt(request.amountWei), data: '0x' };
  let userOperationHash;
  if (network.mode === 'alchemy') {
    const parameters = ['factory', 'fees', 'gas', 'nonce', 'signature', 'authorization'];
    const prepared = await bundler.prepareUserOperation({ account: agentAccount, calls: [call], parameters });
    const sponsored = { ...prepared, maxFeePerGas: 0n, maxPriorityFeePerGas: 0n };
    const signature = await agentAccount.signUserOperation(sponsored);
    userOperationHash = await bundler.sendUserOperation({ ...sponsored, signature, parameters });
  } else userOperationHash = await bundler.sendUserOperation({ calls: [call] });
  const receipt = await bundler.waitForUserOperationReceipt({ hash: userOperationHash });
  return { userOperationHash, transactionHash: receipt.receipt.transactionHash };
}

let paymentQueue = Promise.resolve();
const serializePayment = operation => {
  const running = paymentQueue.then(operation, operation);
  paymentQueue = running.catch(() => {});
  return running;
};
const replaceLedgerEvent = event => {
  const ledger = readJson(ledgerPath, []);
  const index = ledger.findIndex(item => item.requestId === event.requestId);
  if (index >= 0) ledger[index] = event; else ledger.unshift(event);
  writeJson(ledgerPath, ledger);
};

async function handlePayment(req, res, request) {
  const path = policyFor(request.chainId);
  const loaded = path ? readJson(path, null) : null;
  if (!loaded) return respond(res, 409, { error: 'No policy is installed for this network.' });
  const policy = normalizedPolicy(loaded);
  if (!requestAuthorized(req, policy)) return respond(res, 401, { error: 'A verified owner session or agent service token is required.' });
  let humanApprovalVerified = false;
  try { humanApprovalVerified = await verifyPaymentApproval(policy, request); } catch {}
  const decision = evaluatePayment(policy, { ...request, humanApprovalVerified }, readJson(ledgerPath, []));
  const network = networks[policy.chainId];
  const base = {
    requestId: request.requestId, policyId: policy.policyId, smartAccount: policy.smartAccount, ownerAddress: policy.ownerAddress,
    actor: 'AI agent', intent: `Pay ${request.amountWei} wei`, amountWei: request.amountWei,
    recipient: request.recipient, network: network.name, chainId: policy.chainId, timestamp: Date.now()
  };
  if (!decision.allowed) {
    const event = { ...base, status: 'blocked', reason: decision.reason };
    replaceLedgerEvent(event);
    return respond(res, 403, event);
  }
  replaceLedgerEvent({ ...base, status: 'pending', reason: decision.reason });
  try {
    const publicClient = createPublicClient({ chain: network.chain, transport: http(network.rpc) });
    const balance = await publicClient.getBalance({ address: policy.smartAccount });
    const floor = BigInt(policy.balanceFloorWei || 0);
    const amount = BigInt(request.amountWei);
    if (balance < amount + floor) {
      const event = { ...base, status: 'blocked', reason: 'BALANCE_FLOOR_BREACH', availableWei: balance.toString(), balanceFloorWei: floor.toString() };
      replaceLedgerEvent(event);
      return respond(res, 403, event);
    }
    const event = { ...base, status: 'confirmed', reason: decision.reason, ...(await executePayment(policy, request)) };
    replaceLedgerEvent(event);
    return respond(res, 200, event);
  } catch (error) {
    const event = { ...base, status: 'failed', reason: error.shortMessage || error.message };
    replaceLedgerEvent(event);
    return respond(res, 502, event);
  }
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return respond(res, 204, {});
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4174');
    if (req.method === 'GET' && url.pathname === '/status') {
      const policies = Object.fromEntries(Object.entries(networks).map(([id, network]) => {
        const policy = readJson(network.policyPath, null);
        return [id, policy ? { chainId: Number(id), status: policy.status, smartAccount: policy.smartAccount, expiresAt: policy.expiresAt } : null];
      }));
      return respond(res, 200, { ready: true, agentAddress: identity.address, service, authRequired: true, policyInstalled: Object.values(policies).some(Boolean), policies });
    }
    if (req.method === 'GET' && url.pathname === '/auth/challenge') {
      const ownerAddress = url.searchParams.get('owner');
      if (!isAddress(ownerAddress || '')) return respond(res, 400, { error: 'A valid owner address is required.' });
      const nonce = randomBytes(24).toString('hex');
      const expiresAt = Date.now() + 5 * 60_000;
      const message = ownerSessionMessage({ ownerAddress, nonce, expiresAt });
      challenges.set(nonce, { ownerAddress, expiresAt, message });
      return respond(res, 200, { nonce, expiresAt, message });
    }
    if (req.method === 'POST' && url.pathname === '/auth/verify') {
      const body = await bodyJson(req);
      const challenge = challenges.get(body.nonce);
      challenges.delete(body.nonce);
      if (!challenge || challenge.expiresAt <= Date.now() || challenge.ownerAddress.toLowerCase() !== body.ownerAddress?.toLowerCase()) {
        return respond(res, 401, { error: 'The owner session challenge is invalid or expired.' });
      }
      const valid = await verifyMessage({ address: challenge.ownerAddress, message: challenge.message, signature: body.signature });
      if (!valid) return respond(res, 401, { error: 'Owner signature verification failed.' });
      return respond(res, 200, createSession(challenge.ownerAddress));
    }
    if (req.method === 'GET' && url.pathname === '/activity') {
      const session = sessionFor(req);
      if (!session && !bearerAuthorized(req)) return respond(res, 401, { error: 'Authentication required.' });
      const activity = readJson(ledgerPath, []).filter(item => !session || !item.ownerAddress || item.ownerAddress.toLowerCase() === session.ownerAddress.toLowerCase());
      return respond(res, 200, { activity });
    }
    if (req.method === 'GET' && url.pathname === '/policy') {
      const chainId = Number(url.searchParams.get('chainId'));
      const path = policyFor(chainId);
      if (!path) return respond(res, 400, { error: 'A supported chainId is required.' });
      const loaded = readJson(path, null);
      if (!loaded) return respond(res, 404, { error: 'No policy is installed for this network.' });
      const policy = normalizedPolicy(loaded);
      if (!requestAuthorized(req, policy)) return respond(res, 401, { error: 'A verified owner session or agent service token is required.' });
      return respond(res, 200, { policy });
    }
    if (req.method === 'POST' && url.pathname === '/policy') {
      const body = await bodyJson(req);
      const policy = normalizedPolicy(body.policy);
      const session = sessionFor(req);
      const sessionValid = session?.ownerAddress.toLowerCase() === policy.ownerAddress.toLowerCase();
      const signatureValid = body.ownerSignature ? await verifyMessage({ address: policy.ownerAddress, message: policyRegistrationMessage(policy), signature: body.ownerSignature }) : false;
      if (!sessionValid && !signatureValid) return respond(res, 401, { error: 'A policy-owner signature is required.' });
      await verifyPolicyEvidence(policy);
      if (!existsSync(ownerPath)) writeFileSync(ownerPath, `${policy.ownerAddress}\n`);
      writeJson(policyFor(policy.chainId), policy);
      const issuedSession = sessionValid ? session : createSession(policy.ownerAddress);
      return respond(res, 200, { saved: true, chainId: policy.chainId, policyId: policy.policyId, session: issuedSession });
    }
    if (req.method === 'POST' && url.pathname === '/pay') {
      const request = await bodyJson(req);
      return await serializePayment(() => handlePayment(req, res, request));
    }
    return respond(res, 404, { error: 'Not found' });
  } catch (error) { return respond(res, 400, { error: error.message }); }
}).listen(4174, '127.0.0.1', () => console.log(`Agent service ready on http://127.0.0.1:4174 as ${signer.address}`));
