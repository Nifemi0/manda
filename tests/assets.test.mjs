import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUnits } from 'viem';
import { assetDecimals, ERC20_HOOK_ENTITY_OFFSET, getUSDGAddress } from '../frontend/assets.js';

test('uses the verified Paxos USDG test contracts on both supported chains', () => {
  assert.equal(getUSDGAddress(421614), '0xFFC95faa3d63Cde504a05B567C600B78C0b41892');
  assert.equal(getUSDGAddress(46630), '0x7E955252E15c84f5768B83c41a71F9eba181802F');
  assert.equal(getUSDGAddress(42161), null);
});

test('uses six USDG decimals and the SDK ERC-20 hook entity offset', () => {
  assert.equal(assetDecimals('USDG'), 6);
  assert.equal(parseUnits('0.25', assetDecimals('USDG')), 250_000n);
  assert.equal(ERC20_HOOK_ENTITY_OFFSET, 0x7fffffff);
});
