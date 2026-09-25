import './wallet.js';
import { agentFetch, ensureAgentSession, readAgentSession } from './agent-session.js';
import { formatUnits } from 'viem';
import { assetDecimals, normalizeAsset } from './assets.js';

const serviceStatus = document.getElementById('serviceStatus');
const serviceBadge = document.getElementById('serviceBadge');
const agentAddress = document.getElementById('agentAddress');
const ownerStatus = document.getElementById('ownerStatus');
const ownerBadge = document.getElementById('ownerBadge');
const policyStatus = document.getElementById('policyStatus');
const policyBadge = document.getElementById('policyBadge');
const overallStatus = document.getElementById('overallStatus');
const connectionMessage = document.getElementById('connectionMessage');
const connectOwner = document.getElementById('connectOwner');
const verifyAccess = document.getElementById('verifyAccess');
const policyFacts = document.getElementById('policyFacts');
const policyEmpty = document.getElementById('policyEmpty');
const codeOutput = document.getElementById('codeOutput');
const snippetLabel = document.getElementById('snippetLabel');
const dialog = document.getElementById('agentDialog');
const chainNames = { 421614: 'Arbitrum Sepolia', 46630: 'Robinhood Testnet' };
let selectedChainId = 421614;
let selectedAsset = 'ETH';
let connectedOwner = null;
let currentPolicy = null;
let status = null;
let activeSnippet = 'javascript';
const isLocal = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
const serviceUrl = isLocal ? 'http://127.0.0.1:4174' : `${window.location.origin}/api/agent`;
const iconMarkup = name => `<svg class="ui-icon" aria-hidden="true"><use href="/icons.svg#icon-${name}"></use></svg>`;
document.getElementById('serviceUrl').textContent = serviceUrl;

const short = value => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '—';
const formatWei = (value, asset = 'ETH') => {
  try {
    const amount = BigInt(value || 0);
    const normalized = normalizeAsset(asset);
    return `${formatUnits(amount, assetDecimals(normalized))} ${normalized}`;
  } catch { return '—'; }
};
const showDialog = (title, message) => {
  document.getElementById('dialogTitle').textContent = title;
  document.getElementById('dialogMessage').textContent = message;
  dialog.showModal();
};
const setBadge = (element, text, kind = '') => {
  element.textContent = text;
  element.className = kind;
};

function snippets() {
  const recipient = currentPolicy?.recipient || '0xApprovedService';
  const asset = normalizeAsset(currentPolicy?.asset || selectedAsset);
  return {
    javascript: {
      label: 'manda-payment.js',
      code: `const MANDA_SERVICE_URL = process.env.MANDA_SERVICE_URL || '${serviceUrl}';

export async function requestMandaPayment({ recipient, amountWei, asset = '${asset}' }) {
  const response = await fetch(\`\${MANDA_SERVICE_URL}/pay\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${process.env.MANDA_AGENT_TOKEN}\`
    },
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      chainId: ${selectedChainId},
      asset,
      recipient,
      amountWei: String(amountWei)
    })
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.reason || result.error);
  return result;
}

// The recipient must match the active Manda policy.
await requestMandaPayment({
  recipient: '${recipient}',
  amountWei: '${asset === 'USDG' ? '1000000' : '100000000000'}',
  asset: '${asset}'
});`
    },
    python: {
      label: 'manda_payment.py',
      code: `import os
import uuid
import requests

MANDA_SERVICE_URL = os.environ.get(
    'MANDA_SERVICE_URL',
    '${serviceUrl}',
)

def request_manda_payment(recipient: str, amount_wei: str, asset: str = '${asset}'):
    response = requests.post(
        f'{MANDA_SERVICE_URL}/pay',
        headers={
            'Authorization': f"Bearer {os.environ['MANDA_AGENT_TOKEN']}",
            'Content-Type': 'application/json',
        },
        json={
            'requestId': str(uuid.uuid4()),
            'chainId': ${selectedChainId},
            'asset': asset,
            'recipient': recipient,
            'amountWei': str(amount_wei),
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()

result = request_manda_payment(
    '${recipient}',
    '${asset === 'USDG' ? '1000000' : '100000000000'}',
    '${asset}',
)`
    },
    curl: {
      label: 'terminal',
      code: `curl --request POST "\${MANDA_SERVICE_URL:-${serviceUrl}}/pay" \\
  --header 'Content-Type: application/json' \\
  --header "Authorization: Bearer $MANDA_AGENT_TOKEN" \\
  --data '{
    "requestId": "replace-with-a-unique-id",
    "chainId": ${selectedChainId},
    "asset": "${asset}",
    "recipient": "${recipient}",
    "amountWei": "100000000000"
  }'`
    },
    schema: {
      label: 'request-payment.tool.json',
      code: `{
  "name": "request_payment",
  "description": "Request a payment within the active Manda policy.",
  "parameters": {
    "type": "object",
    "properties": {
      "recipient": {
        "type": "string",
        "description": "Approved EVM recipient address"
      },
      "amountWei": {
        "type": "string",
        "description": "Positive base-unit integer: wei for ETH, 6-decimal units for USDG"
      },
      "asset": {
        "type": "string",
        "enum": ["ETH", "USDG"],
        "description": "Must match the active mandate asset"
      }
    },
    "required": ["recipient", "amountWei", "asset"],
    "additionalProperties": false
  }
}`
    }
  };
}

function renderSnippet() {
  const snippet = snippets()[activeSnippet];
  snippetLabel.textContent = snippet.label;
  codeOutput.textContent = snippet.code;
}

function renderPolicy(policy) {
  currentPolicy = policy;
  if (!policy) {
    policyFacts.hidden = true;
    policyEmpty.hidden = false;
    renderSnippet();
    return;
  }
  policyEmpty.hidden = true;
  policyFacts.hidden = false;
  document.getElementById('factStatus').textContent = policy.status.toUpperCase();
  document.getElementById('factAccount').textContent = policy.smartAccount;
  document.getElementById('factRecipient').textContent = policy.recipient;
  document.getElementById('factPayment').textContent = formatWei(policy.perPaymentWei, policy.asset);
  document.getElementById('factDaily').textContent = formatWei(policy.dailyLimitWei, policy.asset);
  document.getElementById('factTotal').textContent = formatWei(policy.onchainAllowanceWei || policy.dailyLimitWei, policy.asset);
  document.getElementById('factApproval').textContent = formatWei(policy.approvalThresholdWei, policy.asset);
  document.getElementById('factReserve').textContent = normalizeAsset(policy.asset) === 'USDG' ? 'Gas is sponsored separately' : `${formatWei(policy.balanceFloorWei, 'ETH')} kept in account; gas is sponsored`;
  document.getElementById('factExpiry').textContent = new Date(policy.expiresAt).toLocaleString();
  policyStatus.textContent = `${policy.status === 'active' ? 'Active' : policy.status === 'expired' ? 'Expired' : 'Revoked'} ${selectedAsset} mandate on ${chainNames[selectedChainId]}`;
  setBadge(policyBadge, policy.status.toUpperCase(), policy.status === 'active' ? 'ready' : 'warn');
  renderSnippet();
}

async function loadStatus() {
  try {
    const response = await fetch('/api/agent/status');
    status = await response.json();
    if (!response.ok || !status.ready) throw new Error(status.error || 'Agent service is not ready.');
    serviceStatus.textContent = 'Online and ready for authenticated requests';
    setBadge(serviceBadge, 'ONLINE', 'ready');
    agentAddress.textContent = status.agentAddress;
    document.querySelector('[data-copy-target="agentAddress"]').disabled = false;
    const selected = status.policies?.[String(selectedChainId)]?.[selectedAsset];
    policyStatus.textContent = selected ? `${selected.status === 'active' ? 'Active' : 'Revoked'} ${selectedAsset} mandate on ${chainNames[selectedChainId]}` : `No ${selectedAsset} mandate on ${chainNames[selectedChainId]}`;
    setBadge(policyBadge, selected ? selected.status.toUpperCase() : 'NONE', selected?.status === 'active' ? 'ready' : 'warn');
    overallStatus.className = 'ready';
    overallStatus.innerHTML = '<i></i> SERVICE READY';
    connectionMessage.textContent = 'Service detected. Connect the policy owner to verify private access and inspect the full mandate.';
  } catch (error) {
    serviceStatus.textContent = 'Agent service unavailable';
    setBadge(serviceBadge, 'OFFLINE', 'warn');
    policyStatus.textContent = isLocal ? 'Start npm run agent:serve' : 'Backend deployment needs attention';
    setBadge(policyBadge, 'WAITING', 'warn');
    overallStatus.className = '';
    overallStatus.innerHTML = '<i></i> SERVICE OFFLINE';
    connectionMessage.textContent = error.message;
  }
}

function renderWallet(wallet) {
  connectedOwner = wallet.address || null;
  if (!connectedOwner) {
    ownerStatus.textContent = 'Wallet not connected';
    setBadge(ownerBadge, 'LOCKED');
    verifyAccess.disabled = true;
    connectOwner.innerHTML = `Connect owner wallet ${iconMarkup('external')}`;
    return;
  }
  ownerStatus.textContent = `${short(connectedOwner)} · ${wallet.network?.name || 'Unsupported network'}`;
  const session = readAgentSession(connectedOwner);
  setBadge(ownerBadge, session ? 'VERIFIED' : 'CONNECTED', session ? 'ready' : 'warn');
  verifyAccess.disabled = !status?.ready;
  verifyAccess.textContent = session ? 'Refresh private policy' : 'Verify owner access';
  connectOwner.innerHTML = `Owner connected ${iconMarkup('check')}`;
}

async function verifyOwnerAccess() {
  if (!connectedOwner) throw new Error('Connect the policy owner first.');
  verifyAccess.disabled = true;
  verifyAccess.textContent = 'Waiting for signature…';
  try {
    await ensureAgentSession(connectedOwner);
    setBadge(ownerBadge, 'VERIFIED', 'ready');
    ownerStatus.textContent = `${short(connectedOwner)} · private access verified`;
    const response = await agentFetch(`/api/agent/policy?chainId=${selectedChainId}&asset=${selectedAsset}`, {}, connectedOwner);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load the selected policy.');
    renderPolicy(result.policy);
    connectionMessage.textContent = `Owner session verified. The ${selectedAsset} mandate on ${chainNames[selectedChainId]} is loaded from the authenticated service.`;
  } finally {
    verifyAccess.disabled = false;
    verifyAccess.textContent = 'Refresh private policy';
  }
}

connectOwner.addEventListener('click', async () => {
  try { renderWallet(await MandaWallet.connect()); }
  catch (error) { showDialog('Wallet connection failed.', error.message); }
});
verifyAccess.addEventListener('click', () => verifyOwnerAccess().catch(error => showDialog('Owner verification failed.', error.message)));
document.querySelectorAll('[data-chain-id]').forEach(button => button.addEventListener('click', async () => {
  selectedChainId = Number(button.dataset.chainId);
  document.querySelectorAll('[data-chain-id]').forEach(item => item.classList.toggle('active', item === button));
  document.getElementById('selectedNetwork').textContent = chainNames[selectedChainId].toUpperCase();
  renderPolicy(null);
  const summary = status?.policies?.[String(selectedChainId)]?.[selectedAsset];
  policyStatus.textContent = summary ? `${summary.status === 'active' ? 'Active' : 'Revoked'} ${selectedAsset} mandate on ${chainNames[selectedChainId]}` : `No ${selectedAsset} mandate on ${chainNames[selectedChainId]}`;
  setBadge(policyBadge, summary ? summary.status.toUpperCase() : 'NONE', summary?.status === 'active' ? 'ready' : 'warn');
  renderSnippet();
  if (connectedOwner && readAgentSession(connectedOwner)) {
    try { await verifyOwnerAccess(); } catch (error) { connectionMessage.textContent = error.message; }
  }
}));
document.querySelectorAll('[data-asset]').forEach(button => button.addEventListener('click', async () => {
  selectedAsset = button.dataset.asset;
  document.querySelectorAll('[data-asset]').forEach(item => item.classList.toggle('active', item === button));
  renderPolicy(null);
  const summary = status?.policies?.[String(selectedChainId)]?.[selectedAsset];
  policyStatus.textContent = summary ? `${summary.status === 'active' ? 'Active' : 'Revoked'} ${selectedAsset} mandate on ${chainNames[selectedChainId]}` : `No ${selectedAsset} mandate on ${chainNames[selectedChainId]}`;
  setBadge(policyBadge, summary ? summary.status.toUpperCase() : 'NONE', summary?.status === 'active' ? 'ready' : 'warn');
  renderSnippet();
  if (connectedOwner && readAgentSession(connectedOwner)) {
    try { await verifyOwnerAccess(); } catch (error) { connectionMessage.textContent = error.message; }
  }
}));
document.querySelectorAll('[data-snippet]').forEach(button => button.addEventListener('click', () => {
  activeSnippet = button.dataset.snippet;
  document.querySelectorAll('[data-snippet]').forEach(item => item.classList.toggle('active', item === button));
  renderSnippet();
}));
document.getElementById('copySnippet').addEventListener('click', async event => {
  await navigator.clipboard.writeText(codeOutput.textContent);
  event.currentTarget.innerHTML = `Copied ${iconMarkup('check')}`;
  setTimeout(() => { event.currentTarget.textContent = 'Copy code'; }, 1600);
});
document.querySelector('[data-copy-target="agentAddress"]').addEventListener('click', async event => {
  await navigator.clipboard.writeText(agentAddress.textContent);
  event.currentTarget.innerHTML = `Copied ${iconMarkup('check')}`;
  setTimeout(() => { event.currentTarget.textContent = 'Copy'; }, 1400);
});

renderSnippet();
await loadStatus();
MandaWallet.refresh().then(renderWallet).catch(() => {});
window.addEventListener('walletstatechange', event => renderWallet(event.detail));
