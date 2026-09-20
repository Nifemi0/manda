const STORAGE_KEY = 'manda:v1';
const LEGACY_STORAGE_KEY = 'shared-account:v1';

export function readProductState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const value = JSON.parse(raw || '{}');
    if (!localStorage.getItem(STORAGE_KEY) && raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return value;
  }
  catch { return {}; }
}

export function writeProductState(patch) {
  const next = { ...readProductState(), ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('productstatechange', { detail: next }));
  return next;
}

export function saveSmartAccount({ owner, address, chainId, deployed, transactionHash, userOperationHash }) {
  const current = readProductState();
  return writeProductState({
    owner: owner || current.owner,
    smartAccount: {
      ...(current.smartAccount || {}),
      address,
      chainId,
      deployed: Boolean(deployed),
      transactionHash: transactionHash || current.smartAccount?.transactionHash || null,
      userOperationHash: userOperationHash || current.smartAccount?.userOperationHash || null,
      verifiedAt: new Date().toISOString()
    }
  });
}

export function savePolicy(policy) {
  const current = readProductState();
  const saved = { ...policy, updatedAt: new Date().toISOString() };
  return writeProductState({ policy: saved, policies: { ...(current.policies || {}), [String(policy.chainId)]: saved } });
}

export function policyForChain(chainId) {
  const state = readProductState();
  return state.policies?.[String(chainId)] || (Number(state.policy?.chainId) === Number(chainId) ? state.policy : null);
}

export function saveRobinhoodAccount({ owner, address, deployed, transactionHash, userOperationHash }) {
  const current = readProductState();
  return writeProductState({ owner: owner || current.owner, robinhoodAccount: {
    ...(current.robinhoodAccount || {}), address, chainId: 46630, deployed: Boolean(deployed),
    transactionHash: transactionHash || current.robinhoodAccount?.transactionHash || null,
    userOperationHash: userOperationHash || current.robinhoodAccount?.userOperationHash || null,
    verifiedAt: new Date().toISOString()
  } });
}

export function appendActivity(activity) {
  const current = readProductState();
  return writeProductState({ activity: [{ ...activity, timestamp: activity.timestamp || Date.now() }, ...(current.activity || [])] });
}
