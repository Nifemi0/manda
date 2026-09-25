export const USDG_DECIMALS = 6;
export const ERC20_HOOK_ENTITY_OFFSET = 0x7fffffff;
export const USDG_TESTNET_ADDRESSES = Object.freeze({
  421614: '0xFFC95faa3d63Cde504a05B567C600B78C0b41892',
  46630: '0x7E955252E15c84f5768B83c41a71F9eba181802F'
});

export function normalizeAsset(asset) {
  return String(asset || 'ETH').toUpperCase();
}

export function getUSDGAddress(chainId) {
  return USDG_TESTNET_ADDRESSES[Number(chainId)] || null;
}

export function assetDecimals(asset) {
  return normalizeAsset(asset) === 'USDG' ? USDG_DECIMALS : 18;
}
