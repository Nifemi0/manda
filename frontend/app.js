import { createPublicClient, formatEther, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { robinhoodTestnet } from '@alchemy/common/chains';
import { prepareSmartAccount, revokeAgentPolicy } from './smart-account.js';
import { prepareRobinhoodAccount, revokeRobinhoodPolicy } from './robinhood-account.js';
import { appendActivity, readProductState, savePolicy, writeProductState } from './state.js';
import { agentFetch, clearAgentSession, createPaymentApproval, ensureAgentSession, readAgentSession } from './agent-session.js';
import { policyIdentifier } from './policy-auth.js';

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

async function renderBalances(state) {
  const requests = [
    state.smartAccount?.address ? arbitrumClient.getBalance({ address: state.smartAccount.address }) : Promise.reject(new Error('No Arbitrum account')),
    state.robinhoodAccount?.address ? robinhoodClient.getBalance({ address: state.robinhoodAccount.address }) : Promise.reject(new Error('No Robinhood account'))
  ];
  const [arb, robin] = await Promise.allSettled(requests);
  document.getElementById('arbitrumBalance').textContent = arb.status === 'fulfilled' ? `${Number(formatEther(arb.value)).toFixed(6)} ETH` : 'Not available';
  document.getElementById('robinhoodBalance').textContent = robin.status === 'fulfilled' ? `${Number(formatEther(robin.value)).toFixed(6)} ETH` : 'Not prepared';
}

function renderActivity(items = []) {
  if (!items.length) return;
  const body = document.getElementById('activityBody');
  body.className = 'activity-list';
  body.innerHTML = `<div class="activity-columns"><span>ACTOR</span><span>INTENT</span><span>POLICY RESULT</span><span>NETWORK</span><span>EVIDENCE</span></div>${items.map(item => {
    const explorer = Number(item.chainId) === 46630 ? 'https://explorer.testnet.chain.robinhood.com/tx/' : 'https://sepolia.arbiscan.io/tx/';
    const validHash = /^0x[0-9a-f]{64}$/i.test(item.transactionHash || '');
    const evidence = validHash ? `<a target="_blank" rel="noreferrer" href="${explorer}${item.transactionHash}">${MandaWallet.shortAddress(item.transactionHash)} ↗</a>` : '<span>Policy decision</span>';
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
    evidence.target = '_blank'; evidence.rel = 'noreferrer'; evidence.textContent = 'Open deployment evidence ↗';
  }
  const policyNetwork = Number(policy?.chainId) === 46630 ? 'Robinhood Chain Testnet' : 'Arbitrum Sepolia';
  if (policy) {
    document.getElementById('policyValue').textContent = policy.status === 'active' ? policy.label : 'Revoked';
    document.getElementById('policyDescription').textContent = policy.status === 'active'
      ? `${formatEther(BigInt(policy.perPaymentWei))} ETH per payment · ${formatEther(BigInt(policy.dailyLimitWei))} ETH daily runtime budget · ${formatEther(BigInt(policy.onchainAllowanceWei || policy.dailyLimitWei))} ETH initial onchain total cap · signed approval above ${formatEther(BigInt(policy.approvalThresholdWei || (BigInt(policy.perPaymentWei) / 4n)))} ETH · reserve ${formatEther(BigInt(policy.balanceFloorWei || 1000000000000000n))} ETH.`
      : `Delegated key revoked ${new Date(policy.revokedAt).toLocaleString()}.`;
    const ownerReady = Boolean(connectedOwner && (policy.ownerAddress || state.owner)?.toLowerCase() === connectedOwner.toLowerCase());
    revokeAgent.disabled = policy.status !== 'active' || !ownerReady;
    document.getElementById('revokeDescription').textContent = policy.status === 'active' ? `Disable ${policy.label} and remove its validation hooks immediately.` : 'No active mandate can execute payments.';
    const active = policy.status === 'active';
    approvedPayment.disabled = !active || !ownerReady; blockedPayment.disabled = !active || !ownerReady;
    document.getElementById('approvedAmount').textContent = active ? `${formatEther(BigInt(policy.perPaymentWei) / 10n)} ETH to the approved service.` : 'The mandate is not active.';
    document.getElementById('blockedAmount').textContent = active ? `${formatEther(BigInt(policy.perPaymentWei) * 20n)} ETH exceeds the per-payment cap.` : 'The mandate is not active.';
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
    ? `${policyNetwork} is selected for this policy. Route only to the allowlisted recipient while the reserve remains intact.`
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
    const request = { requestId: crypto.randomUUID(), chainId: policy.chainId, recipient: policy.recipient, amountWei: amountWei.toString() };
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
  if (!address) { clearAgentSession(); renderProductState(); return; }
  ownerValue.textContent = MandaWallet.shortAddress(address);
  ownerNetwork.textContent = network ? `Verified through the wallet on ${network.name}.` : 'Wallet connected on an unsupported network.';
  accountHeadline.innerHTML = 'Human connected.<br>Smart account comes next.';
  accountDescription.textContent = 'The root owner is verified from the connected wallet. No smart account, mandate, balance, or activity is claimed yet.';
  authorityStatus.innerHTML = 'ROOT AUTHORITY<br>CONNECTED';
  dashboardConnect.textContent = 'Wallet connected ✓'; dashboardConnect.disabled = true;
  renderProductState();
  if (readAgentSession(address)) syncAgentActivity(address).catch(() => {});
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
      ? await revokeRobinhoodPolicy({ entityId: state.policy.entityId, recipient: state.policy.recipient })
      : await revokeAgentPolicy({ entityId: state.policy.entityId, recipient: state.policy.recipient });
    const revokedPolicy = { ...state.policy, ownerAddress, status: 'revoked', revokedAt: Date.now(), mandateTransactionHash: state.policy.transactionHash, transactionHash: result.transactionHash, revocationTransactionHash: result.transactionHash, revocationUserOperationHash: result.userOperationHash };
    savePolicy(revokedPolicy);
    const sync = await agentFetch('/api/agent/policy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ policy: revokedPolicy }) }, ownerAddress);
    if (!sync.ok) throw new Error((await sync.json()).error || 'The revoked state could not be synchronized.');
    appendActivity({ actor: 'Human owner', intent: 'Revoke agent mandate', status: 'confirmed', reason: 'REVOKED', network: isRobinhood ? 'Robinhood Chain Testnet' : 'Arbitrum Sepolia', chainId: state.policy.chainId, transactionHash: result.transactionHash });
    revokeAgent.textContent = 'Agent revoked ✓';
  } catch (error) {
    console.error('Revocation failed', error); revokeAgent.textContent = 'Revocation failed — retry'; revokeAgent.disabled = false;
  }
});

window.addEventListener('walletstatechange', event => renderDashboardWallet(event.detail));
window.addEventListener('productstatechange', event => renderProductState(event.detail));
MandaWallet.refresh().then(renderDashboardWallet).catch(() => {});
renderProductState();
