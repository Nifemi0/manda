const serviceBadge = document.getElementById('serviceBadge');
const serviceState = document.getElementById('serviceState');
const heroDot = document.getElementById('heroDot');
const authState = document.getElementById('authState');
const agentAddress = document.getElementById('agentAddress');
const checkedAt = document.getElementById('checkedAt');
const activeCount = document.getElementById('activeCount');
const arbPolicy = document.getElementById('arbPolicy');
const robinhoodPolicy = document.getElementById('robinhoodPolicy');

const short = value => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : 'Unavailable';

function setPolicy(element, policy) {
  const active = policy?.status === 'active';
  element.textContent = active ? 'ACTIVE MANDATE' : policy ? String(policy.status).toUpperCase() : 'NOT REPORTED';
  element.classList.toggle('ready', active);
}

async function loadPublicProof() {
  checkedAt.textContent = new Date().toLocaleString();
  try {
    const response = await fetch('/api/agent/status', { headers: { Accept: 'application/json' } });
    const status = await response.json();
    if (!response.ok || !status.ready) throw new Error(status.error || 'Service did not report ready.');
    const policies = status.policies || {};
    const activePolicies = Object.values(policies).flatMap(byAsset => Object.values(byAsset || {})).filter(policy => policy?.status === 'active');
    serviceBadge.textContent = 'ONLINE';
    serviceBadge.classList.add('ready');
    serviceState.textContent = 'Production service ready';
    heroDot.classList.add('ready');
    authState.textContent = status.authRequired ? 'Required' : 'Not reported';
    agentAddress.textContent = short(status.agentAddress);
    activeCount.innerHTML = `${activePolicies.length} active<br>mandates`;
    const summarize = chainId => Object.values(policies[String(chainId)] || {}).find(policy => policy?.status === 'active') || Object.values(policies[String(chainId)] || {}).find(Boolean);
    setPolicy(arbPolicy, summarize(421614));
    setPolicy(robinhoodPolicy, summarize(46630));
  } catch (error) {
    serviceBadge.textContent = 'UNAVAILABLE';
    serviceState.textContent = 'Live status temporarily unavailable';
    authState.textContent = 'Not verified';
    agentAddress.textContent = 'Not verified';
    activeCount.innerHTML = 'Status<br>unavailable';
    arbPolicy.textContent = 'EVIDENCE LINKED';
    robinhoodPolicy.textContent = 'EVIDENCE LINKED';
  }
}

document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = 'Copied';
    setTimeout(() => { button.textContent = 'Copy'; }, 1400);
  } catch { button.textContent = 'Copy failed'; }
}));

loadPublicProof();
