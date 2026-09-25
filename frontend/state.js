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
  const chainKey = String(policy.chainId);
  const existing = current.policies?.[chainKey];
  const byAsset = existing && (existing.ETH || existing.USDG)
    ? existing
    : existing ? { [String(existing.asset || 'ETH').toUpperCase()]: existing } : {};
  return writeProductState({ policy: saved, policies: { ...(current.policies || {}), [chainKey]: { ...byAsset, [String(policy.asset || 'ETH').toUpperCase()]: saved } } });
}

export function policyForChain(chainId, asset = 'ETH') {
  const state = readProductState();
  const entry = state.policies?.[String(chainId)];
  const normalizedAsset = String(asset || 'ETH').toUpperCase();
  if (entry?.ETH || entry?.USDG) return entry[normalizedAsset] || null;
  if (entry && String(entry.asset || 'ETH').toUpperCase() === normalizedAsset) return entry;
  return Number(state.policy?.chainId) === Number(chainId) && String(state.policy?.asset || 'ETH').toUpperCase() === normalizedAsset ? state.policy : null;
}

export function policiesForChain(chainId) {
  const entry = readProductState().policies?.[String(chainId)];
  if (!entry) return [];
  return entry.ETH || entry.USDG ? Object.values(entry).filter(Boolean) : [entry];
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
