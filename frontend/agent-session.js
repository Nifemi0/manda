import { paymentApprovalMessage, policyRegistrationMessage } from './policy-auth.js';

const SESSION_KEY = 'manda:agent-session:v1';
const LEGACY_SESSION_KEY = 'shared-account:agent-session:v1';

async function signMessage(ownerAddress, message) {
  const provider = MandaWallet.getProvider();
  if (!provider) throw new Error('Connect the owner wallet first.');
  const active = (await provider.request({ method: 'eth_accounts' }))[0];
  if (!active || active.toLowerCase() !== ownerAddress.toLowerCase()) {
    throw new Error('The connected wallet is not the policy owner.');
  }
  try {
    return await provider.request({ method: 'personal_sign', params: [message, ownerAddress] });
  } catch (error) {
    if (error?.code === 4001) throw error;
    return provider.request({ method: 'personal_sign', params: [ownerAddress, message] });
  }
}

export function clearAgentSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

export function readAgentSession(ownerAddress) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem(LEGACY_SESSION_KEY);
    const value = JSON.parse(raw || 'null');
    if (!value || value.ownerAddress?.toLowerCase() !== ownerAddress?.toLowerCase() || value.expiresAt <= Date.now()) return null;
    if (!sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    return value;
  } catch { return null; }
}

export async function ensureAgentSession(ownerAddress) {
  const existing = readAgentSession(ownerAddress);
  if (existing) return existing;
  const challengeResponse = await fetch(`/api/agent/auth/challenge?owner=${encodeURIComponent(ownerAddress)}`);
  const challenge = await challengeResponse.json();
  if (!challengeResponse.ok) throw new Error(challenge.error || 'Could not create an owner session challenge.');
  const signature = await signMessage(ownerAddress, challenge.message);
  const response = await fetch('/api/agent/auth/verify', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ownerAddress, nonce: challenge.nonce, signature })
  });
  const session = await response.json();
  if (!response.ok) throw new Error(session.error || 'Owner session verification failed.');
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function agentFetch(path, options = {}, ownerAddress) {
  const session = await ensureAgentSession(ownerAddress);
  return fetch(path, {
    ...options,
    headers: { ...(options.headers || {}), 'x-agent-session': session.token }
  });
}

export async function registerPolicy(policy) {
  const signature = await signMessage(policy.ownerAddress, policyRegistrationMessage(policy));
  const response = await fetch('/api/agent/policy', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ policy, ownerSignature: signature })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Agent service did not accept the signed policy.');
  if (result.session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.session));
  return result;
}

export async function createPaymentApproval(policy, request) {
  const expiresAt = Date.now() + 5 * 60_000;
  const signature = await signMessage(policy.ownerAddress, paymentApprovalMessage(policy, request, expiresAt));
  return { expiresAt, signature };
}
