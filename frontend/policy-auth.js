const normalizedAddress = value => String(value || '').toLowerCase();
const normalizedRecipients = policy => {
  const values = Array.isArray(policy.recipients) ? policy.recipients : [policy.recipient];
  return [...new Set(values.filter(Boolean).map(normalizedAddress))].sort();
};

export function policyIdentifier(policy) {
  return `${Number(policy.chainId)}:${String(policy.transactionHash || '').toLowerCase()}`;
}

export function policyRegistrationMessage(policy) {
  return [
    'Manda policy registration',
    'Version: 1',
    `Owner: ${normalizedAddress(policy.ownerAddress)}`,
    `Agent: ${normalizedAddress(policy.agentAddress)}`,
    `Account: ${normalizedAddress(policy.smartAccount)}`,
    `Chain: ${Number(policy.chainId)}`,
    `Asset: ${String(policy.asset || 'ETH').toUpperCase()}`,
    `Token: ${normalizedAddress(policy.tokenAddress || '')}`,
    `Entity: ${Number(policy.entityId)}`,
    `Recipients: ${normalizedRecipients(policy).join(',')}`,
    `Per payment: ${String(policy.perPaymentWei)}`,
    `Daily runtime budget: ${String(policy.dailyLimitWei)}`,
    `Onchain total allowance: ${String(policy.onchainAllowanceWei || policy.dailyLimitWei)}`,
    `Approval threshold: ${String(policy.approvalThresholdWei)}`,
    `Reserve: ${String(policy.balanceFloorWei)}`,
    `Expires: ${Number(policy.expiresAt)}`,
    `Status: ${String(policy.status)}`,
    `Evidence: ${String(policy.transactionHash || '').toLowerCase()}`
  ].join('\n');
}

export function paymentApprovalMessage(policy, request, approvalExpiresAt) {
  return [
    'Manda payment approval',
    'Version: 1',
    `Policy: ${policyIdentifier(policy)}`,
    `Request: ${String(request.requestId)}`,
    `Account: ${normalizedAddress(policy.smartAccount)}`,
    `Chain: ${Number(request.chainId)}`,
    `Asset: ${String(request.asset || policy.asset || 'ETH').toUpperCase()}`,
    `Recipient: ${normalizedAddress(request.recipient)}`,
    `Amount: ${String(request.amountWei)}`,
    `Approval expires: ${Number(approvalExpiresAt)}`
  ].join('\n');
}
