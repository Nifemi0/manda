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
  const expired = policy?.status === 'active' && Number(policy.expiresAt) <= Date.now();
  const active = policy?.status === 'active' && !expired;
  element.textContent = active ? 'ACTIVE MANDATE' : expired ? 'EXPIRED' : policy?.status ? String(policy.status).toUpperCase() : 'NOT REPORTED';
  element.classList.toggle('ready', active);
}

function policyEntries(entry) {
  if (!entry || typeof entry !== 'object') return [];
  return 'status' in entry ? [entry] : Object.values(entry).filter(value => value && typeof value === 'object');
}

async function loadPublicProof() {
  checkedAt.textContent = new Date().toLocaleString();
  try {
    const response = await fetch('/api/agent/status', { headers: { Accept: 'application/json' } });
    const status = await response.json();
    if (!response.ok || !status.ready) throw new Error(status.error || 'Service did not report ready.');
    const policies = status.policies || {};
    const activePolicies = Object.values(policies).flatMap(policyEntries).filter(policy => policy.status === 'active' && Number(policy.expiresAt) > Date.now());
    serviceBadge.textContent = 'ONLINE';
    serviceBadge.classList.add('ready');
    serviceState.textContent = 'Production service ready';
    heroDot.classList.add('ready');
    authState.textContent = status.authRequired ? 'Required' : 'Not reported';
    agentAddress.textContent = short(status.agentAddress);
    activeCount.innerHTML = `${activePolicies.length} active<br>mandates`;
    const summarize = chainId => {
      const entries = policyEntries(policies[String(chainId)]);
      return entries.find(policy => policy.status === 'active' && Number(policy.expiresAt) > Date.now()) || entries[0];
    };
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
