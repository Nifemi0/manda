import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicClient, encodeFunctionData, erc20Abi, http, isAddress, verifyMessage } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import { robinhoodTestnet } from '@alchemy/common/chains';
import { createBundlerClient, createPaymasterClient } from 'viem/account-abstraction';
import { AllowlistModule, DefaultModuleAddress, NativeTokenLimitModule, toModularAccountV2 } from '@alchemy/smart-accounts';
import { evaluatePayment, policyRecipients } from '../frontend/policy-engine.js';
import { paymentApprovalMessage, policyIdentifier, policyRegistrationMessage } from '../frontend/policy-auth.js';
import { ERC20_HOOK_ENTITY_OFFSET, getUSDGAddress, normalizeAsset } from '../frontend/assets.js';

const root = new URL('../', import.meta.url);
const projectRoot = fileURLToPath(root);
const readText = path => readFileSync(path, 'utf8').trim();
const readEnv = key => {
  if (process.env[key]) return process.env[key].trim();
  const envPath = new URL('.env.local', root);
  if (!existsSync(envPath)) return '';
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find(item => item.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
};
const runtimeDir = readEnv('MANDA_DATA_DIR');
if (runtimeDir) mkdirSync(runtimeDir, { recursive: true });
const runtimePath = name => runtimeDir ? resolve(runtimeDir, name) : resolve(projectRoot, name);
const secretPath = runtimePath('.agent-key.local');
const apiTokenPath = runtimePath('.agent-api-token.local');
const ownerPath = runtimePath('.owner-address.local');
const ledgerPath = runtimePath('.agent-ledger.local.json');
const ledgerTempPath = runtimePath('.agent-ledger.local.tmp');
const identity = JSON.parse(readFileSync(new URL('frontend/agent-identity.json', root), 'utf8'));
const service = JSON.parse(readFileSync(new URL('frontend/demo-service.json', root), 'utf8'));
const privateKey = readEnv('AGENT_PRIVATE_KEY') || (existsSync(secretPath) ? readText(secretPath) : '');
if (!privateKey) throw new Error('AGENT_PRIVATE_KEY or .agent-key.local is required.');
const signer = privateKeyToAccount(privateKey);
if (identity.address.toLowerCase() !== signer.address.toLowerCase()) {
  throw new Error(`Configured agent key resolves to ${signer.address}, but the public identity is ${identity.address}.`);
}
const agentApiToken = readEnv('AGENT_SERVICE_TOKEN') || (() => {
  if (!existsSync(apiTokenPath)) writeFileSync(apiTokenPath, `${randomBytes(32).toString('hex')}\n`);
  return readText(apiTokenPath);
})();
const apiKey = readEnv('ALCHEMY_API_KEY') || readEnv('VITE_ALCHEMY_API_KEY');
const gasPolicyId = readEnv('ALCHEMY_GAS_POLICY_ID') || readEnv('VITE_ALCHEMY_GAS_POLICY_ID');

const networks = {
  421614: { chain: arbitrumSepolia, name: 'Arbitrum Sepolia', rpc: 'https://sepolia-rollup.arbitrum.io/rpc', bundler: 'https://api.candide.dev/public/v3/arbitrum-sepolia', policyPath: runtimePath('.policy-state.local.json'), mode: 'candide' },
  46630: { chain: robinhoodTestnet, name: 'Robinhood Chain Testnet', rpc: 'https://rpc.testnet.chain.robinhood.com', bundler: `https://robinhood-testnet.g.alchemy.com/v2/${apiKey}`, policyPath: runtimePath('.robinhood-policy-state.local.json'), mode: 'alchemy' }
};
const readJson = (path, fallback) => existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
const writeJson = (path, value) => {
  if (path === ledgerPath) {
    writeFileSync(ledgerTempPath, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(ledgerTempPath, ledgerPath);
  } else writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const policyFor = (chainId, asset = 'ETH') => {
  const networkId = Number(chainId);
  const network = networks[networkId];
  if (!network) return null;
  if (normalizeAsset(asset) === 'USDG') return runtimePath(networkId === 421614 ? '.usdg-policy-state.local.json' : '.robinhood-usdg-policy-state.local.json');
  return network.policyPath;
};
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
  const policyStatus = policy.status === 'active' && Number(policy.expiresAt) <= Date.now() ? 'expired' : policy.status;
  policy = {
    ...policy,
    status: policyStatus,
    asset: normalizeAsset(policy.asset),
    approvalThresholdWei: policy.approvalThresholdWei || (BigInt(policy.perPaymentWei) / 4n).toString(),
    balanceFloorWei: policy.balanceFloorWei || '1000000000000000'
  };
  for (const field of ['ownerAddress', 'agentAddress', 'smartAccount']) {
    if (!isAddress(policy[field] || '')) throw new Error(`${field} must be a valid address.`);
  }
  const recipients = policyRecipients(policy);
  if (!recipients.length || recipients.length > 32 || recipients.some(recipient => !isAddress(recipient))) throw new Error('recipients must contain 1 to 32 valid EVM addresses.');
  const trustedOwner = existsSync(ownerPath) ? readText(ownerPath) : '';
  if (trustedOwner && policy.ownerAddress.toLowerCase() !== trustedOwner.toLowerCase()) throw new Error('This service is pinned to another owner.');
  if (policy.agentAddress.toLowerCase() !== signer.address.toLowerCase()) throw new Error('Agent identity mismatch.');
  if (!networks[Number(policy.chainId)]) throw new Error(`Unsupported chain ${policy.chainId}.`);
  if (!['ETH', 'USDG'].includes(policy.asset)) throw new Error('Unsupported payment asset.');
  if (policy.asset === 'USDG') {
    const expectedToken = getUSDGAddress(policy.chainId);
    if (!expectedToken || !isAddress(policy.tokenAddress || '') || policy.tokenAddress.toLowerCase() !== expectedToken.toLowerCase()) {
      throw new Error('USDG is only supported at the verified testnet token address for this chain.');
    }
  } else if (policy.tokenAddress) throw new Error('Native ETH policies cannot set a token address.');
  if (!Number.isInteger(Number(policy.entityId)) || Number(policy.entityId) < 0) throw new Error('Invalid policy entity.');
  for (const field of ['perPaymentWei', 'dailyLimitWei', 'approvalThresholdWei', 'balanceFloorWei']) {
    try { if (BigInt(policy[field]) < 0n) throw new Error(); } catch { throw new Error(`${field} must be a non-negative integer.`); }
  }
  if (BigInt(policy.perPaymentWei) <= 0n || BigInt(policy.dailyLimitWei) <= 0n) throw new Error('Payment and daily limits must be positive.');
  if (BigInt(policy.perPaymentWei) > BigInt(policy.dailyLimitWei)) throw new Error('Per-payment limit cannot exceed the daily budget.');
  if (BigInt(policy.approvalThresholdWei) > BigInt(policy.perPaymentWei)) throw new Error('Approval threshold cannot exceed the payment cap.');
  if (!['active', 'revoked', 'expired'].includes(policy.status)) throw new Error('Policy status is invalid.');
  const result = {
    ...policy, chainId: Number(policy.chainId), entityId: Number(policy.entityId),
    recipients,
    onchainAllowanceWei: String(policy.onchainAllowanceWei || policy.dailyLimitWei)
  };
  result.recipient = recipients[0];
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
  if (policy.asset === 'USDG') {
    const [symbol, decimals] = await Promise.all([
      client.readContract({ address: policy.tokenAddress, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address: policy.tokenAddress, abi: erc20Abi, functionName: 'decimals' })
    ]);
    if (symbol !== 'USDG' || decimals !== 6) throw new Error('The configured USDG contract metadata does not match Paxos testnet USDG.');
  }
  if (policy.status === 'active') {
    if (policy.asset === 'USDG') {
      const nativeLimit = await client.readContract({
        address: DefaultModuleAddress.NATIVE_TOKEN_LIMIT, abi: NativeTokenLimitModule.abi,
        functionName: 'limits', args: [BigInt(policy.entityId), policy.smartAccount]
      });
      if (nativeLimit !== 0n) throw new Error('A USDG mandate must not authorize native-token transfers.');
    }
    const remaining = await readOnchainAllowance(policy, client);
    if (remaining <= 0n || remaining > BigInt(policy.onchainAllowanceWei)) throw new Error('Onchain allowance does not match the signed policy.');
  }
}

async function readOnchainAllowance(policy, client = createPublicClient({ chain: networks[policy.chainId].chain, transport: http(networks[policy.chainId].rpc) })) {
  return policy.asset === 'USDG'
    ? client.readContract({
      address: DefaultModuleAddress.ALLOWLIST, abi: AllowlistModule.abi,
      functionName: 'erc20SpendLimits', args: [BigInt(policy.entityId) + BigInt(ERC20_HOOK_ENTITY_OFFSET), policy.tokenAddress, policy.smartAccount]
    })
    : client.readContract({
      address: DefaultModuleAddress.NATIVE_TOKEN_LIMIT, abi: NativeTokenLimitModule.abi,
      functionName: 'limits', args: [BigInt(policy.entityId), policy.smartAccount]
    });
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
  const call = policy.asset === 'USDG'
    ? { to: policy.tokenAddress, value: 0n, data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [request.recipient, BigInt(request.amountWei)] }) }
    : { to: request.recipient, value: BigInt(request.amountWei), data: '0x' };
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
const denialMessage = reason => ({
  REVOKED: 'The owner revoked this mandate.', EXPIRED: 'The mandate has expired.', WRONG_CHAIN: 'This mandate is for another chain.',
  ASSET_NOT_ALLOWED: 'This asset is not enabled by the mandate.', RECIPIENT_NOT_ALLOWED: 'This destination is outside the approved recipient set.',
  PAYMENT_LIMIT_EXCEEDED: 'The amount exceeds the per-payment cap.', DAILY_LIMIT_EXCEEDED: 'The remaining daily budget is too small.',
  TOTAL_ALLOWANCE_EXCEEDED: 'The cumulative onchain allowance is exhausted.', HUMAN_APPROVAL_REQUIRED: 'Owner approval is required for this amount.',
  REPLAYED_REQUEST: 'This requestId was already used.', INVALID_REQUEST: 'The payment request is malformed.'
}[reason] || 'The payment was blocked by policy.');

async function handlePayment(req, res, request) {
  request.asset = normalizeAsset(request.asset || 'ETH');
  const path = policyFor(request.chainId, request.asset);
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
    actor: 'AI agent', asset: request.asset, tokenAddress: policy.tokenAddress || null,
    intent: `Pay ${request.amountWei} ${request.asset === 'USDG' ? 'USDG base units' : 'wei'}`, amountWei: request.amountWei,
    recipient: request.recipient, network: network.name, chainId: policy.chainId, timestamp: Date.now()
  };
  if (!decision.allowed) {
    const event = { ...base, status: 'blocked', code: decision.reason, reason: decision.reason, message: denialMessage(decision.reason), retryable: decision.reason === 'HUMAN_APPROVAL_REQUIRED' };
    replaceLedgerEvent(event);
    return respond(res, 403, event);
  }
  replaceLedgerEvent({ ...base, status: 'pending', reason: decision.reason });
  try {
    const publicClient = createPublicClient({ chain: network.chain, transport: http(network.rpc) });
    const amount = BigInt(request.amountWei);
    const remainingAllowance = await readOnchainAllowance(policy, publicClient);
    if (amount > remainingAllowance) {
      const event = { ...base, status: 'blocked', reason: 'TOTAL_ALLOWANCE_EXCEEDED', remainingAllowanceWei: remainingAllowance.toString() };
      replaceLedgerEvent(event);
      return respond(res, 403, event);
    }
    const balance = policy.asset === 'USDG'
      ? await publicClient.readContract({ address: policy.tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [policy.smartAccount] })
      : await publicClient.getBalance({ address: policy.smartAccount });
    const floor = policy.asset === 'USDG' ? 0n : BigInt(policy.balanceFloorWei || 0);
    if (balance < amount + floor) {
      const event = { ...base, status: 'blocked', reason: policy.asset === 'USDG' ? 'TOKEN_BALANCE_TOO_LOW' : 'BALANCE_FLOOR_BREACH', availableWei: balance.toString(), balanceFloorWei: floor.toString() };
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
        const byAsset = Object.fromEntries(['ETH', 'USDG'].map(asset => {
          const policy = readJson(policyFor(id, asset), null);
          const status = policy?.status === 'active' && Number(policy.expiresAt) <= Date.now() ? 'expired' : policy?.status;
          return [asset, policy ? { chainId: Number(id), asset, status, smartAccount: policy.smartAccount, expiresAt: policy.expiresAt } : null];
        }));
        return [id, byAsset];
      }));
      return respond(res, 200, { ready: true, agentAddress: identity.address, service, authRequired: true, policyInstalled: Object.values(policies).some(byAsset => Object.values(byAsset).some(Boolean)), policies });
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
    if (req.method === 'GET' && url.pathname === '/capabilities') {
      const chainId = Number(url.searchParams.get('chainId'));
      const asset = normalizeAsset(url.searchParams.get('asset') || 'ETH');
      const path = policyFor(chainId, asset);
      if (!path) return respond(res, 400, { error: 'A supported chainId and asset are required.', code: 'UNSUPPORTED_NETWORK' });
      const loaded = readJson(path, null);
      if (!loaded) return respond(res, 404, { error: 'No policy is installed for this network.', code: 'POLICY_NOT_FOUND' });
      const policy = normalizedPolicy(loaded);
      if (!requestAuthorized(req, policy)) return respond(res, 401, { error: 'A verified owner session or agent service token is required.', code: 'AUTH_REQUIRED' });
      const ledger = readJson(ledgerPath, []);
      const now = Date.now();
      const dayStart = now - (now % 86_400_000);
      const spend = ledger.filter(item => ['pending', 'confirmed'].includes(item.status) && item.policyId === policy.policyId && item.timestamp >= dayStart && item.timestamp <= now)
        .reduce((sum, item) => sum + BigInt(item.amountWei || 0), 0n);
      return respond(res, 200, {
        service: 'Manda', chainId, asset, status: policy.status,
        recipients: policyRecipients(policy),
        limits: { perPayment: policy.perPaymentWei, daily: policy.dailyLimitWei, total: policy.onchainAllowanceWei, approvalThreshold: policy.approvalThresholdWei },
        usage: { spentToday: spend.toString(), dailyRemaining: (BigInt(policy.dailyLimitWei) > spend ? BigInt(policy.dailyLimitWei) - spend : 0n).toString() },
        expiresAt: policy.expiresAt,
        actions: { quote: false, pay: policy.status === 'active', revoke: 'owner-only' },
        endpoints: ['/capabilities', '/pay', '/activity']
      });
    }
    if (req.method === 'GET' && url.pathname === '/policy') {
      const chainId = Number(url.searchParams.get('chainId'));
      const asset = normalizeAsset(url.searchParams.get('asset') || 'ETH');
      const path = policyFor(chainId, asset);
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
      writeJson(policyFor(policy.chainId, policy.asset), policy);
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
