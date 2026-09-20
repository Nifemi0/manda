import { formatEther, parseEther } from 'viem';
import { deploySmartAccount, installAgentPolicy, prepareSmartAccount, smartAccountConfig } from './smart-account.js';
import { deployRobinhoodAccount, installRobinhoodPolicy, prepareRobinhoodAccount, robinhoodAccountConfig } from './robinhood-account.js';
import { readProductState, policyForChain, savePolicy, saveRobinhoodAccount, saveSmartAccount } from './state.js';
import { registerPolicy } from './agent-session.js';

const stepButtons = [...document.querySelectorAll('.setup-step')];
const panels = [...document.querySelectorAll('.setup-panel')];
const nextButton = document.getElementById('nextButton');
const backButton = document.getElementById('backButton');
const stepCounter = document.getElementById('stepCounter');
const walletDialog = document.getElementById('walletDialog');
const connectButton = document.getElementById('connectButton');
const walletHeading = document.getElementById('walletHeading');
const walletDetail = document.getElementById('walletDetail');
const walletNote = document.getElementById('walletNote');
const networkActions = document.getElementById('networkActions');
const agentLabel = document.getElementById('agentLabel');
const agentPurpose = document.getElementById('agentPurpose');
const mandateForm = document.getElementById('mandateForm');
const policyRecipient = document.getElementById('policyRecipient');
const budgetProfile = document.getElementById('budgetProfile');
const perPaymentLimit = document.getElementById('perPaymentLimit');
const dailyLimit = document.getElementById('dailyLimit');
const approvalThreshold = document.getElementById('approvalThreshold');
const balanceFloor = document.getElementById('balanceFloor');
const policyPreview = document.getElementById('policyPreview');
const policyExpiry = document.getElementById('policyExpiry');
const policyAction = document.getElementById('policyAction');
const policyStatus = document.getElementById('policyStatus');
let agentIdentity;
const accountAction = document.getElementById('accountAction');
const accountActionNote = document.getElementById('accountActionNote');
const smartAccountStatus = document.getElementById('smartAccountStatus');
let connectedOwner;
let preparedAccount;
let currentChainId;
let activeStep = 1;

const budgetProfiles = {
  starter: { perPayment: '0.000001', daily: '0.000003', threshold: '0.0000005', reserve: '0.001', copy: 'Starter keeps the agent narrow while you validate the workflow.' },
  standard: { perPayment: '0.000004', daily: '0.000005', threshold: '0.000001', reserve: '0.001', copy: 'Standard allows small routine payments while keeping a reserve.' },
  funded: { perPayment: '0.001', daily: '0.01', threshold: '0.0001', reserve: '0.005', copy: 'Funded unlocks larger automation while preserving a visible reserve.' }
};

function updatePolicyPreview() {
  if (!policyPreview) return;
  const profile = budgetProfiles[budgetProfile?.value];
  policyPreview.textContent = profile?.copy || `Custom policy · ${perPaymentLimit.value || '—'} ETH per payment · ${dailyLimit.value || '—'} ETH daily.`;
}

budgetProfile?.addEventListener('change', () => {
  const profile = budgetProfiles[budgetProfile.value];
  if (profile) {
    perPaymentLimit.value = profile.perPayment;
    dailyLimit.value = profile.daily;
    approvalThreshold.value = profile.threshold;
    balanceFloor.value = profile.reserve;
  }
  updatePolicyPreview();
});
[perPaymentLimit, dailyLimit, approvalThreshold, balanceFloor].forEach(input => input?.addEventListener('input', () => {
  if (budgetProfile) budgetProfile.value = 'custom';
  updatePolicyPreview();
}));

function showStep(step) {
  activeStep = Math.max(1, Math.min(4, step));
  stepButtons.forEach(button => button.classList.toggle('active', Number(button.dataset.step) === activeStep));
  panels.forEach(panel => panel.classList.toggle('active', Number(panel.dataset.panel) === activeStep));
  stepCounter.textContent = `${activeStep} OF 4`;
  backButton.disabled = activeStep === 1;
  nextButton.textContent = activeStep === 4 ? 'Return to first step ↺' : 'Preview next step →';
}

stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
nextButton.addEventListener('click', () => showStep(activeStep === 4 ? 1 : activeStep + 1));
backButton.addEventListener('click', () => showStep(activeStep - 1));
function showWalletError(error) {
  document.getElementById('dialogHeading').textContent = 'Wallet connection needs attention.';
  document.getElementById('dialogMessage').textContent = error?.message || 'The wallet did not complete the request.';
  walletDialog.showModal();
}

function renderWallet({ address, network, supported }) {
  if (!address) {
    walletHeading.textContent = 'Not connected';
    walletDetail.textContent = 'No address or account data has been loaded.';
    walletNote.textContent = 'Connect an EVM wallet. No signature or transaction is requested.';
    connectButton.innerHTML = 'Connect wallet <span>↗</span>';
    networkActions.hidden = true;
    return;
  }
  walletHeading.textContent = MandaWallet.shortAddress(address);
  if (currentChainId && currentChainId !== network?.chainId) preparedAccount = null;
  currentChainId = network?.chainId;
  connectedOwner = address;
  walletDetail.textContent = network ? `Connected on ${network.name}.` : 'Connected on an unsupported network.';
  walletNote.textContent = supported ? 'Owner verified. Choose a target network or continue.' : 'Switch to one of the two supported test networks.';
  connectButton.innerHTML = 'Wallet connected <span>✓</span>';
  networkActions.hidden = false;
  document.querySelectorAll('[data-chain]').forEach(button => button.classList.toggle('current', button.dataset.chain === network?.chainId));
  document.getElementById('reviewOwner').textContent = MandaWallet.shortAddress(address);
  document.getElementById('reviewNetwork').textContent = network?.name || 'Unsupported network';
  const selectedPolicy = network ? policyForChain(Number.parseInt(network.chainId, 16)) : null;
  if (selectedPolicy) applySavedPolicy(selectedPolicy);
  else if (policyAction) {
    policyAction.disabled = false;
    policyAction.textContent = 'Review and sign mandate';
    policyStatus.textContent = 'No mandate has been installed on this network.';
  }
}

smartAccountStatus.textContent = smartAccountConfig.apiKeyReady
  ? 'Arbitrum uses Candide sponsorship; Robinhood uses the configured Alchemy Bundler and Gas Manager policy.'
  : 'Alchemy API key required in .env.local before account preparation can run.';

accountAction.addEventListener('click', async () => {
  accountAction.disabled = true;
  accountAction.textContent = preparedAccount ? 'Waiting for signature…' : 'Preparing address…';
  try {
    if (!preparedAccount) {
      const isRobinhood = currentChainId === '0xb626';
      preparedAccount = isRobinhood ? await prepareRobinhoodAccount(connectedOwner) : await prepareSmartAccount(connectedOwner);
      preparedAccount.chainId = isRobinhood ? robinhoodAccountConfig.chain.id : smartAccountConfig.chain.id;
      if (isRobinhood) saveRobinhoodAccount({ owner: connectedOwner, address: preparedAccount.address, deployed: preparedAccount.deployed });
      else saveSmartAccount({ owner: connectedOwner, address: preparedAccount.address, chainId: smartAccountConfig.chain.id, deployed: preparedAccount.deployed });
      document.getElementById('reviewAccount').textContent = MandaWallet.shortAddress(preparedAccount.address);
      accountActionNote.textContent = preparedAccount.deployed
        ? 'This Modular Account V2 is already deployed.'
        : preparedAccount.sponsored ? 'Address prepared. Deployment will request one signature.' : 'Address prepared. Add a gas policy before deployment.';
      accountAction.textContent = preparedAccount.deployed ? 'Smart identity deployed ✓' : 'Deploy smart identity';
      accountAction.disabled = preparedAccount.deployed || !preparedAccount.sponsored;
      return;
    }
    const isRobinhood = preparedAccount.chainId === robinhoodAccountConfig.chain.id;
    // Rehydrate the module-level account/bundler after a page reload or Vite
    // hot update. The saved address alone is not enough to deploy; the
    // bundler client must be recreated before sending the UserOperation.
    preparedAccount = isRobinhood ? await prepareRobinhoodAccount(connectedOwner) : await prepareSmartAccount(connectedOwner);
    preparedAccount.chainId = isRobinhood ? robinhoodAccountConfig.chain.id : smartAccountConfig.chain.id;
    const result = isRobinhood ? await deployRobinhoodAccount() : await deploySmartAccount();
    if (isRobinhood) saveRobinhoodAccount({ owner: connectedOwner, address: result.address, deployed: true, transactionHash: result.transactionHash, userOperationHash: result.userOperationHash });
    else saveSmartAccount({ owner: connectedOwner, address: result.address, chainId: smartAccountConfig.chain.id, deployed: true, transactionHash: result.transactionHash, userOperationHash: result.userOperationHash });
    document.getElementById('reviewAccount').textContent = MandaWallet.shortAddress(result.address);
    accountActionNote.textContent = `Deployed in transaction ${MandaWallet.shortAddress(result.transactionHash)}.`;
    accountAction.textContent = 'Smart identity deployed ✓';
  } catch (error) {
    console.error('Smart account action failed', error);
    showWalletError(error);
    accountAction.textContent = preparedAccount ? 'Deploy smart identity' : 'Prepare smart identity';
    accountAction.disabled = false;
  }
});

function renderPolicyDraft() {
  const label = agentLabel.value.trim();
  const purpose = agentPurpose.value;
  document.getElementById('reviewPolicy').textContent = label && purpose ? `Unsigned draft · ${label} · ${purpose}` : 'Not configured';
}

async function loadPolicyInputs() {
  const [agent, service] = await Promise.all([
    fetch('./agent-identity.json').then(response => response.json()),
    fetch('./demo-service.json').then(response => response.json())
  ]);
  agentIdentity = agent;
  document.getElementById('agentAddress').textContent = `AGENT KEY · ${MandaWallet.shortAddress(agent.address)}`;
  policyRecipient.value = service.address;
  const savedPolicy = readProductState().policy;
  if (savedPolicy) applySavedPolicy(savedPolicy);
  else {
    perPaymentLimit.value = perPaymentLimit.value || budgetProfiles.standard.perPayment;
    dailyLimit.value = dailyLimit.value || budgetProfiles.standard.daily;
    approvalThreshold.value = approvalThreshold.value || '0.000001';
    balanceFloor.value = balanceFloor.value || '0.001';
  }
  updatePolicyPreview();
  if (!policyExpiry.value) {
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setSeconds(0, 0);
    policyExpiry.value = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
}

function applySavedPolicy(savedPolicy) {
  budgetProfile.value = savedPolicy.profile || 'custom';
  agentLabel.value = savedPolicy.label || agentLabel.value;
  agentPurpose.value = savedPolicy.purpose || agentPurpose.value;
  perPaymentLimit.value = savedPolicy.perPaymentWei ? formatEther(BigInt(savedPolicy.perPaymentWei)) : budgetProfiles.standard.perPayment;
  dailyLimit.value = savedPolicy.dailyLimitWei ? formatEther(BigInt(savedPolicy.dailyLimitWei)) : budgetProfiles.standard.daily;
  approvalThreshold.value = savedPolicy.approvalThresholdWei ? formatEther(BigInt(savedPolicy.approvalThresholdWei)) : formatEther(BigInt(savedPolicy.perPaymentWei) / 4n);
  balanceFloor.value = savedPolicy.balanceFloorWei ? formatEther(BigInt(savedPolicy.balanceFloorWei)) : '0.001';
  policyStatus.textContent = savedPolicy.status === 'active'
    ? `Active onchain · ${Number(savedPolicy.chainId) === 46630 ? 'Robinhood' : 'Arbitrum'} · ${MandaWallet.shortAddress(savedPolicy.transactionHash)}`
    : 'Revoked mandate loaded. A new entity can now be installed.';
  policyAction.disabled = savedPolicy.status === 'active';
  policyAction.textContent = savedPolicy.status === 'active' ? 'Revoke active mandate before replacing' : 'Review and sign mandate';
  updatePolicyPreview();
}

mandateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!connectedOwner) return showWalletError(new Error('Connect the human owner first.'));
  if (currentChainId !== '0x66eee' && currentChainId !== '0xb626') return showWalletError(new Error('Switch to Arbitrum Sepolia or Robinhood Chain Testnet before installing the mandate.'));
  if (!agentIdentity) return showWalletError(new Error('The agent identity is not ready.'));
  const perPaymentWei = parseEther(perPaymentLimit.value);
  const dailyLimitWei = parseEther(dailyLimit.value);
  const approvalThresholdWei = parseEther(approvalThreshold.value);
  const balanceFloorWei = parseEther(balanceFloor.value);
  if (perPaymentWei <= 0n || dailyLimitWei <= 0n || approvalThresholdWei < 0n || balanceFloorWei < 0n || perPaymentWei > dailyLimitWei || approvalThresholdWei > perPaymentWei) {
    return showWalletError(new Error('Keep all limits positive, keep auto-approval at or below the per-payment cap, and keep the per-payment cap at or below the daily total.'));
  }
  policyAction.disabled = true;
  policyAction.textContent = 'Waiting for owner signature…';
  policyStatus.textContent = 'Preparing the smart account and permission hooks.';
  try {
    const isRobinhood = currentChainId === '0xb626';
    const targetChainId = isRobinhood ? robinhoodAccountConfig.chain.id : smartAccountConfig.chain.id;
    const previousPolicy = policyForChain(targetChainId);
    if (previousPolicy?.status === 'active') throw new Error('Revoke the active mandate on this network before installing a replacement.');
    const entityId = Number(previousPolicy?.entityId || 0) + 1;
    preparedAccount = isRobinhood ? await prepareRobinhoodAccount(connectedOwner) : await prepareSmartAccount(connectedOwner);
    const result = isRobinhood ? await installRobinhoodPolicy({
      agentAddress: agentIdentity.address,
      recipient: policyRecipient.value,
      dailyLimitWei,
      expiresAt: policyExpiry.value,
      entityId
    }) : await installAgentPolicy({
      agentAddress: agentIdentity.address,
      recipient: policyRecipient.value,
      dailyLimitWei,
      expiresAt: policyExpiry.value,
      entityId
    });
    const savedPolicy = {
      label: agentLabel.value.trim(), purpose: agentPurpose.value, profile: budgetProfile.value, ownerAddress: connectedOwner, agentAddress: agentIdentity.address,
      recipient: policyRecipient.value, perPaymentWei: perPaymentWei.toString(), dailyLimitWei: dailyLimitWei.toString(),
      approvalThresholdWei: approvalThresholdWei.toString(), balanceFloorWei: balanceFloorWei.toString(),
      onchainAllowanceWei: dailyLimitWei.toString(),
      expiresAt: new Date(policyExpiry.value).getTime(), chainId: isRobinhood ? robinhoodAccountConfig.chain.id : smartAccountConfig.chain.id, entityId: result.entityId,
      smartAccount: preparedAccount.address, status: 'active', transactionHash: result.transactionHash, userOperationHash: result.userOperationHash
    };
    await registerPolicy(savedPolicy);
    savePolicy(savedPolicy);
    policyStatus.textContent = `Active onchain · ${MandaWallet.shortAddress(result.transactionHash)}`;
    policyAction.textContent = 'Mandate installed ✓';
    document.getElementById('reviewPolicy').textContent = `${agentLabel.value.trim()} · active until ${new Date(policyExpiry.value).toLocaleString()}`;
  } catch (error) {
    console.error('Policy installation failed', error);
    try {
      localStorage.setItem('manda:last-policy-error', JSON.stringify({
        message: error?.message || String(error),
        time: new Date().toISOString()
      }));
    } catch {}
    showWalletError(error);
    policyStatus.textContent = 'The mandate was not installed.';
    policyAction.textContent = 'Install onchain mandate';
    policyAction.disabled = false;
  }
});

connectButton.addEventListener('click', async () => {
  connectButton.disabled = true;
  walletNote.textContent = 'Waiting for wallet approval…';
  try { renderWallet(await MandaWallet.connect()); }
  catch (error) { showWalletError(error); walletNote.textContent = 'Connection was not completed.'; }
  finally { connectButton.disabled = false; }
});

networkActions.addEventListener('click', async event => {
  const button = event.target.closest('[data-chain]');
  if (!button) return;
  try { renderWallet(await MandaWallet.switchNetwork(button.dataset.chain)); }
  catch (error) { showWalletError(error); }
});

window.addEventListener('walletstatechange', event => renderWallet(event.detail));
agentLabel.addEventListener('input', renderPolicyDraft);
agentPurpose.addEventListener('change', renderPolicyDraft);
MandaWallet.refresh().then(renderWallet).catch(showWalletError);
loadPolicyInputs().catch(showWalletError);
