import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import { paymentApprovalMessage, policyRegistrationMessage } from '../frontend/policy-auth.js';

const account = privateKeyToAccount(generatePrivateKey());
const policy = {
  ownerAddress: account.address,
  agentAddress: '0x1111111111111111111111111111111111111111',
  smartAccount: '0x2222222222222222222222222222222222222222',
  chainId: 46630,
  entityId: 1,
  recipient: '0x3333333333333333333333333333333333333333',
  perPaymentWei: '100', dailyLimitWei: '500', onchainAllowanceWei: '500',
  approvalThresholdWei: '50', balanceFloorWei: '25', expiresAt: 2_000_000_000_000,
  status: 'active', transactionHash: `0x${'4'.repeat(64)}`
};

test('owner policy signatures fail after policy tampering', async () => {
  const message = policyRegistrationMessage(policy);
  const signature = await account.signMessage({ message });
  assert.equal(await verifyMessage({ address: account.address, message, signature }), true);
  assert.equal(await verifyMessage({ address: account.address, message: policyRegistrationMessage({ ...policy, dailyLimitWei: '501' }), signature }), false);
});

test('payment approvals bind request, amount, destination, chain, and expiry', async () => {
  const request = { requestId: 'approval-request', chainId: policy.chainId, recipient: policy.recipient, amountWei: '75' };
  const expiresAt = Date.now() + 60_000;
  const message = paymentApprovalMessage(policy, request, expiresAt);
  const signature = await account.signMessage({ message });
  assert.equal(await verifyMessage({ address: account.address, message, signature }), true);
  assert.equal(await verifyMessage({ address: account.address, message: paymentApprovalMessage(policy, { ...request, amountWei: '76' }, expiresAt), signature }), false);
  assert.equal(await verifyMessage({ address: account.address, message: paymentApprovalMessage(policy, { ...request, asset: 'USDG' }, expiresAt), signature }), false);
});

test('owner policy signatures bind the payment asset and token', async () => {
  const usdgPolicy = { ...policy, asset: 'USDG', tokenAddress: '0x4444444444444444444444444444444444444444' };
  const message = policyRegistrationMessage(usdgPolicy);
  const signature = await account.signMessage({ message });
  assert.equal(await verifyMessage({ address: account.address, message, signature }), true);
  assert.equal(await verifyMessage({ address: account.address, message: policyRegistrationMessage({ ...usdgPolicy, tokenAddress: '0x5555555555555555555555555555555555555555' }), signature }), false);
});

test('owner policy signatures bind the normalized recipient set', () => {
  const multi = { ...policy, recipients: [policy.recipient, '0x4444444444444444444444444444444444444444'] };
  const changed = { ...multi, recipients: [policy.recipient, '0x5555555555555555555555555555555555555555'] };
  assert.notEqual(policyRegistrationMessage(multi), policyRegistrationMessage(changed));
  assert.equal(policyRegistrationMessage(multi), policyRegistrationMessage({ ...multi, recipients: [...multi.recipients].reverse() }));
});
