import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePayment, PolicyReason } from '../frontend/policy-engine.js';

const now = Date.UTC(2026, 8, 20, 12);
const recipient = '0x1111111111111111111111111111111111111111';
const policy = { status: 'active', policyId: '421614:policy', smartAccount: '0x3333333333333333333333333333333333333333', chainId: 421614, recipient, perPaymentWei: '100', dailyLimitWei: '500', onchainAllowanceWei: '1000', expiresAt: now + 60_000, revokedAt: null };
const request = { requestId: 'request-1', chainId: 421614, recipient, amountWei: '100' };

test('permits an exact-boundary payment', () => assert.deepEqual(evaluatePayment(policy, request, [], now), { allowed: true, reason: PolicyReason.APPROVED, spentToday: '0' }));
test('rejects a payment above the per-payment cap', () => assert.equal(evaluatePayment(policy, { ...request, amountWei: '101' }, [], now).reason, PolicyReason.PAYMENT_LIMIT_EXCEEDED));
test('rejects spending above the daily allowance', () => assert.equal(evaluatePayment(policy, request, [{ requestId: 'old-request', amountWei: '401', status: 'confirmed', timestamp: now - 1_000, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }], now).reason, PolicyReason.DAILY_LIMIT_EXCEEDED));
test('daily budget can reset while the separate lifetime allowance remains available', () => {
  const policyWithLifetimeCap = { ...policy, dailyLimitWei: '500', onchainAllowanceWei: '1000' };
  const yesterday = [{ requestId: 'yesterday', amountWei: '450', status: 'confirmed', timestamp: now - 86_400_001, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(policyWithLifetimeCap, request, yesterday, now).reason, PolicyReason.APPROVED);
});
test('lifetime allowance does not reset with the UTC daily budget', () => {
  const policyWithLifetimeCap = { ...policy, dailyLimitWei: '500', onchainAllowanceWei: '150' };
  const yesterday = [{ requestId: 'yesterday', amountWei: '100', status: 'confirmed', timestamp: now - 86_400_001, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(policyWithLifetimeCap, request, yesterday, now).reason, PolicyReason.TOTAL_ALLOWANCE_EXCEEDED);
});
test('legacy mandates safely treat their old daily amount as a cumulative total cap', () => {
  const legacyPolicy = { ...policy, onchainAllowanceWei: undefined, dailyLimitWei: '500' };
  const priorSpend = [{ requestId: 'legacy-spend', amountWei: '450', status: 'confirmed', timestamp: now - 1_000, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(legacyPolicy, request, priorSpend, now).reason, PolicyReason.TOTAL_ALLOWANCE_EXCEEDED);
});
test('checks hard spend caps before asking the owner for a signature', () => {
  const limited = { ...policy, perPaymentWei: '200', approvalThresholdWei: '50', onchainAllowanceWei: '150' };
  const previousSpend = [{ requestId: 'spent', amountWei: '100', status: 'confirmed', timestamp: now - 1_000, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(limited, request, previousSpend, now).reason, PolicyReason.TOTAL_ALLOWANCE_EXCEEDED);
});
test('rejects an unapproved recipient', () => assert.equal(evaluatePayment(policy, { ...request, recipient: '0x2222222222222222222222222222222222222222' }, [], now).reason, PolicyReason.RECIPIENT_NOT_ALLOWED));
test('accepts any address in the signed recipient set and rejects addresses outside it', () => {
  const multi = { ...policy, recipients: [recipient, '0x2222222222222222222222222222222222222222'] };
  assert.equal(evaluatePayment(multi, { ...request, recipient: '0x2222222222222222222222222222222222222222' }, [], now).allowed, true);
  assert.equal(evaluatePayment(multi, { ...request, recipient: '0x4444444444444444444444444444444444444444' }, [], now).reason, PolicyReason.RECIPIENT_NOT_ALLOWED);
});
test('legacy single-recipient policies remain compatible', () => {
  const { recipients, ...legacy } = { ...policy, recipients: [recipient] };
  assert.equal(evaluatePayment(legacy, request, [], now).allowed, true);
});
test('rejects an expired policy', () => assert.equal(evaluatePayment({ ...policy, expiresAt: now }, request, [], now).reason, PolicyReason.EXPIRED));
test('rejects a revoked agent', () => assert.equal(evaluatePayment({ ...policy, revokedAt: now - 1 }, request, [], now).reason, PolicyReason.REVOKED));
test('rejects replayed request ids', () => assert.equal(evaluatePayment(policy, request, [{ requestId: 'request-1', amountWei: '1', status: 'blocked', timestamp: now }], now).reason, PolicyReason.REPLAYED_REQUEST));
test('rejects a request on another chain', () => assert.equal(evaluatePayment(policy, { ...request, chainId: 46630 }, [], now).reason, PolicyReason.WRONG_CHAIN));
test('requires human approval above the auto-approval threshold', () => {
  const guarded = { ...policy, approvalThresholdWei: '50' };
  assert.equal(evaluatePayment(guarded, request, [], now).reason, PolicyReason.HUMAN_APPROVAL_REQUIRED);
  assert.equal(evaluatePayment(guarded, { ...request, humanApprovalVerified: true }, [], now).reason, PolicyReason.APPROVED);
});
test('does not trust a caller supplied humanApproval boolean', () => {
  const guarded = { ...policy, approvalThresholdWei: '50' };
  assert.equal(evaluatePayment(guarded, { ...request, humanApproval: true }, [], now).reason, PolicyReason.HUMAN_APPROVAL_REQUIRED);
});
test('rejects zero, negative, malformed, and missing request identifiers', () => {
  assert.equal(evaluatePayment(policy, { ...request, amountWei: '0' }, [], now).reason, PolicyReason.INVALID_REQUEST);
  assert.equal(evaluatePayment(policy, { ...request, amountWei: '-1' }, [], now).reason, PolicyReason.INVALID_REQUEST);
  assert.equal(evaluatePayment(policy, { ...request, amountWei: 'wat' }, [], now).reason, PolicyReason.INVALID_REQUEST);
  assert.equal(evaluatePayment(policy, { ...request, requestId: '' }, [], now).reason, PolicyReason.INVALID_REQUEST);
});
test('rejects status-revoked policies even without revokedAt', () => {
  assert.equal(evaluatePayment({ ...policy, status: 'revoked' }, request, [], now).reason, PolicyReason.REVOKED);
});
test('scopes daily totals to the current chain, account, and policy', () => {
  const unrelated = [{ requestId: 'other-request', amountWei: '500', status: 'confirmed', timestamp: now - 1_000, chainId: 46630, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(policy, request, unrelated, now).reason, PolicyReason.APPROVED);
});
test('counts pending reservations against the daily budget', () => {
  const reserved = [{ requestId: 'pending-request', amountWei: '450', status: 'pending', timestamp: now - 1_000, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(policy, request, reserved, now).reason, PolicyReason.DAILY_LIMIT_EXCEEDED);
});
test('allows a signed approval to retry the same request after an approval-required block', () => {
  const guarded = { ...policy, approvalThresholdWei: '50' };
  const ledger = [{ requestId: request.requestId, amountWei: request.amountWei, status: 'blocked', reason: PolicyReason.HUMAN_APPROVAL_REQUIRED, timestamp: now, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(guarded, { ...request, humanApprovalVerified: true }, ledger, now).reason, PolicyReason.APPROVED);
});
test('permits a USDG payment only under a USDG mandate', () => {
  const usdgPolicy = { ...policy, asset: 'USDG', tokenAddress: '0x4444444444444444444444444444444444444444', perPaymentWei: '1000000', dailyLimitWei: '5000000', onchainAllowanceWei: '10000000', approvalThresholdWei: '1000000' };
  const usdgRequest = { ...request, asset: 'USDG', amountWei: '1000000' };
  assert.equal(evaluatePayment(usdgPolicy, usdgRequest, [], now).allowed, true);
  assert.equal(evaluatePayment(usdgPolicy, { ...usdgRequest, asset: 'ETH' }, [], now).reason, 'ASSET_NOT_ALLOWED');
});
test('keeps USDG and ETH daily totals in separate ledgers', () => {
  const usdgPolicy = { ...policy, asset: 'USDG' };
  const usdgRequest = { ...request, asset: 'USDG', amountWei: '100' };
  const nativeSpend = [{ requestId: 'native-spend', amountWei: '499', asset: 'ETH', status: 'confirmed', timestamp: now - 1_000, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }];
  assert.equal(evaluatePayment(usdgPolicy, usdgRequest, nativeSpend, now).allowed, true);
  const tokenSpend = [{ ...nativeSpend[0], asset: 'USDG', amountWei: '401' }];
  assert.equal(evaluatePayment(usdgPolicy, usdgRequest, tokenSpend, now).reason, PolicyReason.DAILY_LIMIT_EXCEEDED);
});
