import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePayment, PolicyReason } from '../frontend/policy-engine.js';

const now = Date.UTC(2026, 8, 20, 12);
const recipient = '0x1111111111111111111111111111111111111111';
const policy = { status: 'active', policyId: '421614:policy', smartAccount: '0x3333333333333333333333333333333333333333', chainId: 421614, recipient, perPaymentWei: '100', dailyLimitWei: '500', expiresAt: now + 60_000, revokedAt: null };
const request = { requestId: 'request-1', chainId: 421614, recipient, amountWei: '100' };

test('permits an exact-boundary payment', () => assert.deepEqual(evaluatePayment(policy, request, [], now), { allowed: true, reason: PolicyReason.APPROVED, spentToday: '0' }));
test('rejects a payment above the per-payment cap', () => assert.equal(evaluatePayment(policy, { ...request, amountWei: '101' }, [], now).reason, PolicyReason.PAYMENT_LIMIT_EXCEEDED));
test('rejects spending above the daily allowance', () => assert.equal(evaluatePayment(policy, request, [{ requestId: 'old-request', amountWei: '401', status: 'confirmed', timestamp: now - 1_000, chainId: policy.chainId, smartAccount: policy.smartAccount, policyId: policy.policyId }], now).reason, PolicyReason.DAILY_LIMIT_EXCEEDED));
test('rejects an unapproved recipient', () => assert.equal(evaluatePayment(policy, { ...request, recipient: '0x2222222222222222222222222222222222222222' }, [], now).reason, PolicyReason.RECIPIENT_NOT_ALLOWED));
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
