import { createPublicClient, erc20Abi, formatEther, formatUnits, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { robinhoodTestnet } from '@alchemy/common/chains';
import { prepareSmartAccount, revokeAgentPolicy } from './smart-account.js';
import { prepareRobinhoodAccount, revokeRobinhoodPolicy } from './robinhood-account.js';
import { appendActivity, readProductState, savePolicy, writeProductState } from './state.js';
import { agentFetch, createPaymentApproval, ensureAgentSession, readAgentSession } from './agent-session.js';
import { policyIdentifier } from './policy-auth.js';
import { assetDecimals, normalizeAsset, USDG_TESTNET_ADDRESSES } from './assets.js';

const dashboardConnect = document.getElementById('dashboardConnect');
const ownerValue = document.getElementById('ownerValue');
const ownerNetwork = document.getElementById('ownerNetwork');
const accountHeadline = document.getElementById('accountHeadline');
const accountDescription = document.getElementById('accountDescription');
const authorityStatus = document.getElementById('authorityStatus');
const revokeAgent = document.getElementById('revokeAgent');
const approvedPayment = document.getElementById('approvedPayment');
const blockedPayment = document.getElementById('blockedPayment');
const paymentResult = document.getElementById('paymentResult');
const arbitrumClient = createPublicClient({ chain: arbitrumSepolia, transport: http('https://sepolia-rollup.arbitrum.io/rpc') });
const robinhoodClient = createPublicClient({ chain: robinhoodTestnet, transport: http('https://rpc.testnet.chain.robinhood.com') });
let connectedOwner = null;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const iconMarkup = name => `<svg class="ui-icon" aria-hidden="true"><use href="/icons.svg#icon-${name}"></use></svg>`;

async function renderBalances(state) {
  const getBalances = async (client, account, chainId) => {
    if (!account?.address) throw new Error('Account not prepared');
    const [eth, usdg] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.readContract({ address: USDG_TESTNET_ADDRESSES[chainId], abi: erc20Abi, functionName: 'balanceOf', args: [account.address] })
    ]);
    return `${Number(formatEther(eth)).toFixed(6)} ETH · ${Number(formatUnits(usdg, 6)).toFixed(2)} USDG`;
  };
  const [arb, robin] = await Promise.allSettled([
    getBalances(arbitrumClient, state.smartAccount, 421614),
    getBalances(robinhoodClient, state.robinhoodAccount, 46630)
  ]);
  document.getElementById('arbitrumBalance').textContent = arb.status === 'fulfilled' ? arb.value : 'Not available';
  document.getElementById('robinhoodBalance').textContent = robin.status === 'fulfilled' ? robin.value : 'Not prepared';
}

function renderActivity(items = []) {
  if (!items.length) return;
  const body = document.getElementById('activityBody');
  body.className = 'activity-list';
  body.innerHTML = `<div class="activity-columns"><span>ACTOR</span><span>INTENT</span><span>POLICY RESULT</span><span>NETWORK</span><span>EVIDENCE</span></div>${items.map(item => {
    const explorer = Number(item.chainId) === 46630 ? 'https://explorer.testnet.chain.robinhood.com/tx/' : 'https://sepolia.arbiscan.io/tx/';
    const validHash = /^0x[0-9a-f]{64}$/i.test(item.transactionHash || '');
    const evidence = validHash ? `<a target="_blank" rel="noreferrer" href="${explorer}${item.transactionHash}">${MandaWallet.shortAddress(item.transactionHash)} ${iconMarkup('external')}</a>` : '<span>Policy decision</span>';
    return `<div class="activity-row"><b>${escapeHtml(item.actor)}</b><span>${escapeHtml(item.intent)}</span><strong class="${escapeHtml(item.status)}">${escapeHtml(item.reason || item.status)}</strong><span>${escapeHtml(item.network)}</span>${evidence}</div>`;
  }).join('')}`;
}

function renderProductState(state = readProductState()) {
  let policy = state.policy;
  if (policy && state.owner && (!policy.ownerAddress || !policy.policyId || !state.policies?.[String(policy.chainId)])) {
    policy = { ...policy, ownerAddress: policy.ownerAddress || state.owner, onchainAllowanceWei: policy.onchainAllowanceWei || policy.dailyLimitWei };
    policy.policyId = policy.policyId || policyIdentifier(policy);
    savePolicy(policy);
    return;
  }
  const policyIsRobinhood = Number(policy?.chainId) === 46630;
  const account = policyIsRobinhood ? (state.robinhoodAccount || state.smartAccount) : (state.smartAccount || state.robinhoodAccount);
  renderActivity(state.activity || []);
  if (!account?.address) return;
  const short = MandaWallet.shortAddress(account.address);
  document.getElementById('smartAccountValue').textContent = short;
  document.getElementById('smartAccountDescription').textContent = account.deployed ? `Modular Account V2 bytecode verified on ${policyIsRobinhood ? 'Robinhood Chain Testnet' : 'Arbitrum Sepolia'}.` : 'Counterfactual address prepared; deployment is still required.';
  document.getElementById('arbitrumStatus').textContent = account.deployed ? 'DEPLOYED' : 'PREPARED';
  document.getElementById('arbitrumDetail').textContent = account.deployed ? `Verified smart identity ${short}.` : `Prepared smart identity ${short}.`;
  const robinhood = state.robinhoodAccount;
  if (robinhood?.address) {
    document.getElementById('robinhoodStatus').textContent = robinhood.deployed ? 'DEPLOYED' : 'PREPARED';
    document.getElementById('robinhoodDetail').textContent = `${robinhood.deployed ? 'Verified' : 'Prepared'} smart identity ${MandaWallet.shortAddress(robinhood.address)}.`;
  }
  if (account.transactionHash) {
    const evidence = document.getElementById('smartAccountEvidence');
    evidence.href = `${policyIsRobinhood ? 'https://explorer.testnet.chain.robinhood.com/tx/' : 'https://sepolia.arbiscan.io/tx/'}${account.transactionHash}`;
    evidence.target = '_blank'; evidence.rel = 'noreferrer'; evidence.innerHTML = `Open deployment evidence ${iconMarkup('external')}`;
  }
  const policyNetwork = Number(policy?.chainId) === 46630 ? 'Robinhood Chain Testnet' : 'Arbitrum Sepolia';
  if (policy) {
    const asset = normalizeAsset(policy.asset);
    const formatPolicyAmount = value => `${formatUnits(BigInt(value), assetDecimals(asset))} ${asset}`;
    document.getElementById('policyValue').textContent = policy.status === 'active' ? policy.label : 'Revoked';
    document.getElementById('policyDescription').textContent = policy.status === 'active'
      ? `${formatPolicyAmount(policy.perPaymentWei)} per payment from your account · ${formatPolicyAmount(policy.dailyLimitWei)} daily payment budget (resets at UTC midnight) · ${formatPolicyAmount(policy.onchainAllowanceWei || policy.dailyLimitWei)} total onchain delegated cap (does not reset) · signed approval above ${formatPolicyAmount(policy.approvalThresholdWei || (BigInt(policy.perPaymentWei) / 4n))}${asset === 'ETH' ? ` · keep ${formatEther(BigInt(policy.balanceFloorWei || 1000000000000000n))} ETH in the account` : ''}. Gas is sponsored separately.`
      : `Delegated key revoked ${new Date(policy.revokedAt).toLocaleString()}.`;
    const ownerReady = Boolean(connectedOwner && (policy.ownerAddress || state.owner)?.toLowerCase() === connectedOwner.toLowerCase());
    revokeAgent.disabled = policy.status !== 'active' || !ownerReady;
    document.getElementById('revokeDescription').textContent = policy.status === 'active' ? `Disable ${policy.label} and remove its validation hooks immediately.` : 'No active mandate can execute payments.';
    const active = policy.status === 'active';
    approvedPayment.disabled = !active || !ownerReady; blockedPayment.disabled = !active || !ownerReady;
    document.getElementById('approvedAmount').textContent = active ? `${formatPolicyAmount(BigInt(policy.perPaymentWei) / 10n)} to the approved service.` : 'The mandate is not active.';
    document.getElementById('blockedAmount').textContent = active ? `${formatPolicyAmount(BigInt(policy.perPaymentWei) * 20n)} exceeds the per-payment cap.` : 'The mandate is not active.';
  }
  renderBalances(state).catch(() => {});
  const activePolicy = policy?.status === 'active';
  const sponsorshipDescription = document.getElementById('sponsorshipDescription');
  const sponsorshipState = document.getElementById('sponsorshipState');
  const routingDescription = document.getElementById('routingDescription');
  if (sponsorshipDescription) sponsorshipDescription.textContent = activePolicy
    ? `${policyIsRobinhood ? 'Alchemy BSO' : 'Candide'} sponsors approved ERC-4337 operations on ${policyNetwork}.`
    : 'Sponsorship status will appear after a verified policy is loaded.';
  if (sponsorshipState) sponsorshipState.innerHTML = `<i></i> ${activePolicy ? `ACTIVE ON ${policyNetwork.toUpperCase()}` : 'WAITING FOR POLICY'}`;
  if (routingDescription) routingDescription.textContent = activePolicy
      ? `${policyNetwork} is selected for this ${normalizeAsset(policy.asset)} policy. Payments come from your account, eligible gas is sponsored, the service checks the recipient and daily budget, and the onchain total cap is cumulative.`
    : 'Automatic selection stays unavailable until a standalone path is verified.';
  accountHeadline.innerHTML = account.deployed
    ? (activePolicy ? 'Shared identity live.<br>Agent is bounded.' : 'Shared identity live.<br>Agent policy comes next.')
    : 'Human connected.<br>Deployment comes next.';
  accountDescription.textContent = account.deployed
    ? (activePolicy
      ? `The human-owned smart account is verified on ${policyNetwork}. The separate agent key is active within the approved recipient, allowance, reserve and approval limits.`
      : `The human-owned smart account is verified on ${policyNetwork}. Delegated authority remains disabled until a policy is installed.`)
    : accountDescription.textContent;
  authorityStatus.innerHTML = account.deployed ? 'SMART IDENTITY<br>DEPLOYED' : authorityStatus.innerHTML;
  const footerState = document.getElementById('footerState');
  if (footerState) footerState.innerHTML = `<i></i> ${activePolicy ? `LIVE POLICY LOADED · ${Number(policy.chainId) === 46630 ? 'ROBINHOOD CHAIN TESTNET' : 'ARBITRUM SEPOLIA'}` : 'NO ACTIVE POLICY LOADED'}`;
}

async function syncAgentActivity(ownerAddress = connectedOwner) {
  if (!ownerAddress) throw new Error('Connect the policy owner to load private activity.');
  const response = await agentFetch('/api/agent/activity', {}, ownerAddress);
  if (!response.ok) throw new Error('Agent activity service is unavailable.');
  const { activity } = await response.json();
  writeProductState({ activity });
  return activity;
}

async function syncAgentState(ownerAddress, preferredChainId = 421614) {
  const selectedChainId = [421614, 46630].includes(Number(preferredChainId)) ? Number(preferredChainId) : 421614;
  const chainIds = [selectedChainId, ...[421614, 46630].filter(chainId => chainId !== selectedChainId)];
  const loaded = await Promise.all(chainIds.flatMap(chainId => ['ETH', 'USDG'].map(async asset => {
    const response = await agentFetch(`/api/agent/policy?chainId=${chainId}&asset=${asset}`, {}, ownerAddress);
    if (!response.ok) return null;
    return (await response.json()).policy;
  })));
  const policies = loaded.filter(Boolean);
  if (!policies.length) throw new Error('No deployed mandate is available for this owner.');
  const previousState = readProductState();
  const preferred = policies.find(policy => Number(policy.chainId) === selectedChainId && normalizeAsset(policy.asset) === normalizeAsset(previousState.policy?.asset))
    || policies.find(policy => Number(policy.chainId) === selectedChainId) || policies[0];
  const byChain = { ...(previousState.policies || {}) };
  for (const policy of policies) {
    const chainKey = String(policy.chainId);
    const existing = byChain[chainKey];
    const byAsset = existing?.ETH || existing?.USDG ? existing : existing ? { [normalizeAsset(existing.asset)]: existing } : {};
    byChain[chainKey] = { ...byAsset, [normalizeAsset(policy.asset)]: policy };
  }
  const accountFor = chainId => {
    const entry = byChain[String(chainId)];
    const policy = entry?.ETH || entry?.USDG ? entry.ETH || entry.USDG : entry;
    return policy ? { address: policy.smartAccount, chainId, deployed: true, verifiedAt: new Date().toISOString() } : undefined;
  };
  writeProductState({
    owner: ownerAddress,
    policy: preferred,
    policies: byChain,
    smartAccount: accountFor(421614),
    robinhoodAccount: accountFor(46630)
  });
  await syncAgentActivity(ownerAddress);
}

async function runPayment(kind) {
  const state = readProductState();
  const policy = state.policy;
  if (policy?.status !== 'active') return;
  const ownerAddress = policy.ownerAddress || state.owner;
  if (!connectedOwner || connectedOwner.toLowerCase() !== ownerAddress?.toLowerCase()) {
    paymentResult.className = 'payment-result failed';
    paymentResult.querySelector('span').textContent = 'Connect the policy owner before requesting a payment.';
    return;
  }
  const amountWei = kind === 'approved' ? BigInt(policy.perPaymentWei) / 10n : BigInt(policy.perPaymentWei) * 20n;
  approvedPayment.disabled = true; blockedPayment.disabled = true;
  paymentResult.className = 'payment-result pending';
  paymentResult.querySelector('span').textContent = kind === 'approved' ? 'Agent is evaluating and submitting the sponsored payment…' : 'Agent is evaluating the excessive request…';
  try {
    const request = { requestId: crypto.randomUUID(), chainId: policy.chainId, asset: normalizeAsset(policy.asset), recipient: policy.recipient, amountWei: amountWei.toString() };
    let response = await agentFetch('/api/agent/pay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) }, ownerAddress);
    let result = await response.json();
    if (response.status === 403 && result.reason === 'HUMAN_APPROVAL_REQUIRED') {
      paymentResult.querySelector('span').textContent = 'Owner signature required for this amount…';
      request.approval = await createPaymentApproval(policy, request);
      response = await agentFetch('/api/agent/pay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) }, ownerAddress);
      result = await response.json();
    }
    if (!response.ok && !result.status) throw new Error(result.error || 'The agent service rejected the request.');
    await syncAgentActivity();
    paymentResult.className = `payment-result ${result.status}`;
    paymentResult.querySelector('span').textContent = result.status === 'confirmed'
      ? `Confirmed · ${MandaWallet.shortAddress(result.transactionHash)}`
      : `Blocked · ${result.reason}`;
  } catch (error) {
    paymentResult.className = 'payment-result failed'; paymentResult.querySelector('span').textContent = error.message;
  } finally {
    const latest = readProductState();
    const active = latest.policy?.status === 'active';
    const ownerReady = connectedOwner && (latest.policy?.ownerAddress || latest.owner)?.toLowerCase() === connectedOwner.toLowerCase();
    approvedPayment.disabled = !active || !ownerReady; blockedPayment.disabled = !active || !ownerReady;
  }
}

approvedPayment.addEventListener('click', () => runPayment('approved'));
blockedPayment.addEventListener('click', () => runPayment('blocked'));

function renderDashboardWallet({ address, network }) {
  connectedOwner = address || null;
  if (!address) { renderProductState(); return; }
  ownerValue.textContent = MandaWallet.shortAddress(address);
  ownerNetwork.textContent = network ? `Verified through the wallet on ${network.name}.` : 'Wallet connected on an unsupported network.';
  accountHeadline.innerHTML = 'Human connected.<br>Smart account comes next.';
  accountDescription.textContent = 'The root owner is verified from the connected wallet. No smart account, mandate, balance, or activity is claimed yet.';
  authorityStatus.innerHTML = 'ROOT AUTHORITY<br>CONNECTED';
  dashboardConnect.innerHTML = `Wallet connected ${iconMarkup('check')}`; dashboardConnect.disabled = true;
  renderProductState();
  if (readAgentSession(address)) {
    const preferredChainId = network?.chainId ? Number(network.chainId) : 421614;
    syncAgentState(address, preferredChainId).catch(error => {
      accountDescription.textContent = error.message;
    });
  }
}

dashboardConnect.addEventListener('click', async () => {
  dashboardConnect.disabled = true; dashboardConnect.textContent = 'Waiting for wallet…';
  try { renderDashboardWallet(await MandaWallet.connect()); }
  catch (error) { dashboardConnect.textContent = error.code === 4001 ? 'Connection declined' : 'Wallet unavailable'; }
  finally { if (!ownerValue.textContent.includes('…')) dashboardConnect.disabled = false; }
});

revokeAgent.addEventListener('click', async () => {
  const state = readProductState();
  if (state.policy?.status !== 'active') return;
  revokeAgent.disabled = true; revokeAgent.textContent = 'Waiting for owner signature…';
  try {
    const ownerAddress = state.policy.ownerAddress || state.owner;
    if (!connectedOwner || connectedOwner.toLowerCase() !== ownerAddress?.toLowerCase()) throw new Error('Connect the policy owner before revoking this mandate.');
    const isRobinhood = Number(state.policy.chainId) === 46630;
    await ensureAgentSession(ownerAddress);
    await MandaWallet.switchNetwork(isRobinhood ? '0xb626' : '0x66eee');
    if (isRobinhood) await prepareRobinhoodAccount(ownerAddress); else await prepareSmartAccount(ownerAddress);
    const result = isRobinhood
      ? await revokeRobinhoodPolicy({ entityId: state.policy.entityId, recipient: state.policy.recipient, recipients: state.policy.recipients, asset: state.policy.asset, tokenAddress: state.policy.tokenAddress })
      : await revokeAgentPolicy({ entityId: state.policy.entityId, recipient: state.policy.recipient, recipients: state.policy.recipients, asset: state.policy.asset, tokenAddress: state.policy.tokenAddress });
    const revokedPolicy = { ...state.policy, ownerAddress, status: 'revoked', revokedAt: Date.now(), mandateTransactionHash: state.policy.transactionHash, transactionHash: result.transactionHash, revocationTransactionHash: result.transactionHash, revocationUserOperationHash: result.userOperationHash };
    savePolicy(revokedPolicy);
    const sync = await agentFetch('/api/agent/policy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ policy: revokedPolicy }) }, ownerAddress);
    if (!sync.ok) throw new Error((await sync.json()).error || 'The revoked state could not be synchronized.');
    appendActivity({ actor: 'Human owner', intent: 'Revoke agent mandate', status: 'confirmed', reason: 'REVOKED', network: isRobinhood ? 'Robinhood Chain Testnet' : 'Arbitrum Sepolia', chainId: state.policy.chainId, transactionHash: result.transactionHash });
    revokeAgent.innerHTML = `Agent revoked ${iconMarkup('check')}`;
  } catch (error) {
    console.error('Revocation failed', error); revokeAgent.textContent = 'Revocation failed — retry'; revokeAgent.disabled = false;
  }
});

window.addEventListener('walletstatechange', event => renderDashboardWallet(event.detail));
window.addEventListener('productstatechange', event => renderProductState(event.detail));
MandaWallet.refresh().then(renderDashboardWallet).catch(() => {});
renderProductState();
