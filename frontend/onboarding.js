import { formatEther, formatUnits, isAddress, parseEther, parseUnits } from 'viem';
import { assetDecimals, getUSDGAddress, normalizeAsset } from './assets.js';
import agentIdentityConfig from './agent-identity.json';
import demoService from './demo-service.json';
import { deploySmartAccount, installAgentPolicy, nextArbitrumPolicyEntityId, prepareSmartAccount, smartAccountConfig } from './smart-account.js';
import { deployRobinhoodAccount, installRobinhoodPolicy, nextRobinhoodPolicyEntityId, prepareRobinhoodAccount, robinhoodAccountConfig } from './robinhood-account.js';
import { readProductState, policyForChain, policiesForChain, savePolicy, saveRobinhoodAccount, saveSmartAccount } from './state.js';
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
const paymentAsset = document.getElementById('paymentAsset');
const budgetProfile = document.getElementById('budgetProfile');
const perPaymentLimit = document.getElementById('perPaymentLimit');
const dailyLimit = document.getElementById('dailyLimit');
const totalAllowance = document.getElementById('totalAllowance');
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
  starter: { perPayment: '0.000001', daily: '0.000003', total: '0.00003', threshold: '0.0000005', reserve: '0', copy: 'Starter keeps the agent narrow while you validate the workflow.', usdg: { perPayment: '0.25', daily: '1', total: '10', threshold: '0.05' } },
  standard: { perPayment: '0.000004', daily: '0.000005', total: '0.0001', threshold: '0.000001', reserve: '0', copy: 'Standard allows small routine payments with a clear total delegation ceiling.', usdg: { perPayment: '1', daily: '10', total: '100', threshold: '0.25' } },
  funded: { perPayment: '0.001', daily: '0.01', total: '0.1', threshold: '0.0001', reserve: '0', copy: 'Funded unlocks larger user-funded payments with a higher total ceiling.', usdg: { perPayment: '5', daily: '50', total: '500', threshold: '1' } }
};
const iconMarkup = name => `<svg class="ui-icon" aria-hidden="true"><use href="/icons.svg#icon-${name}"></use></svg>`;

function updatePolicyPreview() {
  if (!policyPreview) return;
  const profile = budgetProfiles[budgetProfile?.value];
  const asset = normalizeAsset(paymentAsset?.value);
  policyPreview.textContent = (asset === 'USDG' ? profile?.usdgCopy : profile?.copy) || `Custom policy · ${perPaymentLimit.value || '—'} ${asset} per payment · ${dailyLimit.value || '—'} ${asset} per UTC day · ${totalAllowance.value || '—'} ${asset} total for this mandate. Your account pays the purchase; Manda sponsors eligible gas.`;
}

function selectPaymentAsset(asset, restore = false) {
  const isUSDG = normalizeAsset(asset) === 'USDG';
  const labels = [perPaymentLimit, dailyLimit, approvalThreshold, balanceFloor].map(input => input?.parentElement);
  if (labels[0]) labels[0].childNodes[0].textContent = `Payment cap (${isUSDG ? 'USDG' : 'ETH'})`;
  if (labels[1]) labels[1].childNodes[0].textContent = `Daily payment budget (${isUSDG ? 'USDG' : 'ETH'})`;
  if (totalAllowance?.parentElement) totalAllowance.parentElement.childNodes[0].textContent = `Total delegated cap (${isUSDG ? 'USDG' : 'ETH'})`;
  if (labels[2]) labels[2].childNodes[0].textContent = `Auto-approve below (${isUSDG ? 'USDG' : 'ETH'})`;
  if (labels[3]) { labels[3].hidden = isUSDG; labels[3].style.display = isUSDG ? 'none' : ''; }
  perPaymentLimit.step = isUSDG ? '0.01' : '0.000001';
  dailyLimit.step = isUSDG ? '0.01' : '0.000001';
  totalAllowance.step = isUSDG ? '0.01' : '0.000001';
  approvalThreshold.step = 'any';
  if (restore) {
    perPaymentLimit.value = isUSDG ? '1' : budgetProfiles.standard.perPayment;
    dailyLimit.value = isUSDG ? '10' : budgetProfiles.standard.daily;
    totalAllowance.value = isUSDG ? budgetProfiles.standard.usdg.total : budgetProfiles.standard.total;
    approvalThreshold.value = isUSDG ? '0.25' : budgetProfiles.standard.threshold;
    balanceFloor.value = budgetProfiles.standard.reserve;
    budgetProfile.value = 'standard';
  }
  updatePolicyPreview();
}

paymentAsset?.addEventListener('change', () => {
  selectPaymentAsset(paymentAsset.value, true);
  const chainId = currentChainId ? Number.parseInt(currentChainId, 16) : null;
  const savedPolicy = chainId ? policyForChain(chainId, paymentAsset.value) : null;
  if (savedPolicy) applySavedPolicy(savedPolicy);
  else if (policyAction) {
    policyAction.disabled = false;
    policyAction.textContent = 'Review and sign mandate';
    policyStatus.textContent = `No ${normalizeAsset(paymentAsset.value)} mandate is installed on this network.`;
  }
});

budgetProfile?.addEventListener('change', () => {
  const profile = budgetProfiles[budgetProfile.value];
  if (profile) {
    const values = normalizeAsset(paymentAsset.value) === 'USDG' ? profile.usdg : profile;
    perPaymentLimit.value = values.perPayment;
    dailyLimit.value = values.daily;
    totalAllowance.value = values.total;
    approvalThreshold.value = values.threshold;
    balanceFloor.value = profile.reserve;
  }
  updatePolicyPreview();
});
[perPaymentLimit, dailyLimit, totalAllowance, approvalThreshold, balanceFloor].forEach(input => input?.addEventListener('input', () => {
  if (budgetProfile) budgetProfile.value = 'custom';
  updatePolicyPreview();
}));

function showStep(step) {
  activeStep = Math.max(1, Math.min(4, step));
  stepButtons.forEach(button => button.classList.toggle('active', Number(button.dataset.step) === activeStep));
  panels.forEach(panel => panel.classList.toggle('active', Number(panel.dataset.panel) === activeStep));
  stepCounter.textContent = `${activeStep} OF 4`;
  backButton.disabled = activeStep === 1;
  nextButton.innerHTML = activeStep === 4 ? `Return to first step ${iconMarkup('refresh')}` : `Preview next step ${iconMarkup('arrow-right')}`;
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
    connectButton.innerHTML = `Connect wallet ${iconMarkup('external')}`;
    networkActions.hidden = true;
    return;
  }
  walletHeading.textContent = MandaWallet.shortAddress(address);
  if (currentChainId && currentChainId !== network?.chainId) preparedAccount = null;
  currentChainId = network?.chainId;
  connectedOwner = address;
  walletDetail.textContent = network ? `Connected on ${network.name}.` : 'Connected on an unsupported network.';
  walletNote.textContent = supported ? 'Owner verified. Choose a target network or continue.' : 'Switch to one of the two supported test networks.';
  connectButton.innerHTML = `Wallet connected ${iconMarkup('check')}`;
  networkActions.hidden = false;
  document.querySelectorAll('[data-chain]').forEach(button => button.classList.toggle('current', button.dataset.chain === network?.chainId));
  document.getElementById('reviewOwner').textContent = MandaWallet.shortAddress(address);
  document.getElementById('reviewNetwork').textContent = network?.name || 'Unsupported network';
  const selectedPolicy = network ? policyForChain(Number.parseInt(network.chainId, 16), paymentAsset.value) : null;
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
      accountAction.textContent = preparedAccount.deployed ? 'Smart identity deployed' : 'Deploy smart identity';
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
    accountAction.textContent = 'Smart identity deployed';
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
  agentIdentity = agentIdentityConfig;
  document.getElementById('agentAddress').textContent = `AGENT KEY · ${MandaWallet.shortAddress(agentIdentity.address)}`;
  policyRecipient.value = demoService.address;
  const savedPolicy = readProductState().policy;
  if (savedPolicy) applySavedPolicy(savedPolicy);
  else {
    perPaymentLimit.value = perPaymentLimit.value || budgetProfiles.standard.perPayment;
    dailyLimit.value = dailyLimit.value || budgetProfiles.standard.daily;
    totalAllowance.value = totalAllowance.value || budgetProfiles.standard.total;
    approvalThreshold.value = approvalThreshold.value || '0.000001';
    balanceFloor.value = balanceFloor.value || '0';
  }
  updatePolicyPreview();
  if (!policyExpiry.value) {
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setSeconds(0, 0);
    policyExpiry.value = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
}

function applySavedPolicy(savedPolicy) {
  paymentAsset.value = normalizeAsset(savedPolicy.asset);
  selectPaymentAsset(paymentAsset.value);
  budgetProfile.value = savedPolicy.profile || 'custom';
  agentLabel.value = savedPolicy.label || agentLabel.value;
  agentPurpose.value = savedPolicy.purpose || agentPurpose.value;
  const formatter = paymentAsset.value === 'USDG' ? (value => formatUnits(BigInt(value), assetDecimals('USDG'))) : (value => formatEther(BigInt(value)));
  perPaymentLimit.value = savedPolicy.perPaymentWei ? formatter(savedPolicy.perPaymentWei) : budgetProfiles.standard.perPayment;
  dailyLimit.value = savedPolicy.dailyLimitWei ? formatter(savedPolicy.dailyLimitWei) : budgetProfiles.standard.daily;
  totalAllowance.value = savedPolicy.onchainAllowanceWei ? formatter(savedPolicy.onchainAllowanceWei) : formatter(savedPolicy.dailyLimitWei);
  approvalThreshold.value = savedPolicy.approvalThresholdWei ? formatter(savedPolicy.approvalThresholdWei) : formatter(BigInt(savedPolicy.perPaymentWei) / 4n);
  balanceFloor.value = savedPolicy.balanceFloorWei ? formatEther(BigInt(savedPolicy.balanceFloorWei)) : '0.001';
  const policyExpired = Number(savedPolicy.expiresAt) <= Date.now();
  policyStatus.textContent = savedPolicy.status === 'active' && !policyExpired
    ? `Active onchain · ${Number(savedPolicy.chainId) === 46630 ? 'Robinhood' : 'Arbitrum'} · ${MandaWallet.shortAddress(savedPolicy.transactionHash)}`
    : savedPolicy.status === 'expired' || policyExpired
      ? 'This mandate has expired. A new entity can now be installed.'
      : 'Revoked mandate loaded. A new entity can now be installed.';
  policyAction.disabled = savedPolicy.status === 'active' && !policyExpired;
  policyAction.textContent = savedPolicy.status === 'active' && !policyExpired ? 'Revoke active mandate before replacing' : 'Review and sign mandate';
  updatePolicyPreview();
}

mandateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!connectedOwner) return showWalletError(new Error('Connect the human owner first.'));
  if (currentChainId !== '0x66eee' && currentChainId !== '0xb626') return showWalletError(new Error('Switch to Arbitrum Sepolia or Robinhood Chain Testnet before installing the mandate.'));
  if (!agentIdentity) return showWalletError(new Error('The agent identity is not ready.'));
  const recipients = [...new Set(policyRecipient.value.split(/[\s,;]+/).map(value => value.trim()).filter(Boolean).map(value => value.toLowerCase()))];
  if (!recipients.length || recipients.length > 32 || recipients.some(recipient => !isAddress(recipient))) return showWalletError(new Error('Enter 1 to 32 valid EVM recipient addresses, separated by new lines.'));
  const recipient = recipients[0];
  const asset = normalizeAsset(paymentAsset.value);
  const decimals = assetDecimals(asset);
  const parseAmount = asset === 'USDG' ? (value => parseUnits(value, decimals)) : parseEther;
  let perPaymentWei; let dailyLimitWei; let onchainAllowanceWei; let approvalThresholdWei; let balanceFloorWei;
  try {
    perPaymentWei = parseAmount(perPaymentLimit.value);
    dailyLimitWei = parseAmount(dailyLimit.value);
    onchainAllowanceWei = parseAmount(totalAllowance.value);
    approvalThresholdWei = parseAmount(approvalThreshold.value);
    balanceFloorWei = asset === 'USDG' ? 0n : parseEther(balanceFloor.value);
  } catch {
    return showWalletError(new Error(`Enter valid ${asset} amounts using no more than ${decimals} decimal places.`));
  }
  if (!Number.isFinite(new Date(policyExpiry.value).getTime()) || new Date(policyExpiry.value).getTime() <= Date.now()) {
    return showWalletError(new Error('Choose a mandate expiry in the future.'));
  }
  if (perPaymentWei <= 0n || dailyLimitWei <= 0n || onchainAllowanceWei <= 0n || approvalThresholdWei < 0n || balanceFloorWei < 0n || perPaymentWei > dailyLimitWei || dailyLimitWei > onchainAllowanceWei || approvalThresholdWei > perPaymentWei) {
    return showWalletError(new Error('Keep the per-payment cap at or below the daily budget, the daily budget at or below the total delegated cap, and auto-approval at or below the per-payment cap.'));
  }
  policyAction.disabled = true;
  policyAction.textContent = 'Waiting for owner signature…';
  policyStatus.textContent = 'Preparing the smart account and permission hooks.';
  try {
    const isRobinhood = currentChainId === '0xb626';
    const targetChainId = isRobinhood ? robinhoodAccountConfig.chain.id : smartAccountConfig.chain.id;
    const previousPolicy = policyForChain(targetChainId, asset);
    if (previousPolicy?.status === 'active' && Number(previousPolicy.expiresAt) > Date.now()) throw new Error('Revoke the active mandate on this network before installing a replacement.');
    const firstCandidate = Math.max(0, ...policiesForChain(targetChainId).map(item => Number(item.entityId) || 0)) + 1;
    const tokenAddress = asset === 'USDG' ? getUSDGAddress(isRobinhood ? robinhoodAccountConfig.chain.id : smartAccountConfig.chain.id) : undefined;
    if (asset === 'USDG' && !tokenAddress) throw new Error('USDG is unavailable on this test network.');
    preparedAccount = isRobinhood ? await prepareRobinhoodAccount(connectedOwner) : await prepareSmartAccount(connectedOwner);
    const entityId = await (isRobinhood ? nextRobinhoodPolicyEntityId(firstCandidate) : nextArbitrumPolicyEntityId(firstCandidate));
    const result = isRobinhood ? await installRobinhoodPolicy({
      agentAddress: agentIdentity.address,
      recipient,
      recipients,
      dailyLimitWei,
      onchainAllowanceWei,
      expiresAt: policyExpiry.value,
      entityId,
      asset,
      tokenAddress
    }) : await installAgentPolicy({
      agentAddress: agentIdentity.address,
      recipient,
      recipients,
      dailyLimitWei,
      onchainAllowanceWei,
      expiresAt: policyExpiry.value,
      entityId,
      asset,
      tokenAddress
    });
    const savedPolicy = {
      label: agentLabel.value.trim(), purpose: agentPurpose.value, profile: budgetProfile.value, ownerAddress: connectedOwner, agentAddress: agentIdentity.address,
      recipient, recipients, asset, tokenAddress, perPaymentWei: perPaymentWei.toString(), dailyLimitWei: dailyLimitWei.toString(),
      approvalThresholdWei: approvalThresholdWei.toString(), balanceFloorWei: balanceFloorWei.toString(),
      onchainAllowanceWei: onchainAllowanceWei.toString(),
      expiresAt: new Date(policyExpiry.value).getTime(), chainId: isRobinhood ? robinhoodAccountConfig.chain.id : smartAccountConfig.chain.id, entityId: result.entityId,
      smartAccount: preparedAccount.address, status: 'active', transactionHash: result.transactionHash, userOperationHash: result.userOperationHash
    };
    await registerPolicy(savedPolicy);
    savePolicy(savedPolicy);
    policyStatus.textContent = `Active onchain · ${MandaWallet.shortAddress(result.transactionHash)}`;
    policyAction.textContent = 'Mandate installed';
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
