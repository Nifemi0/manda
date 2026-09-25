export const PolicyReason = Object.freeze({
  APPROVED: 'APPROVED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  WRONG_CHAIN: 'WRONG_CHAIN',
  ASSET_NOT_ALLOWED: 'ASSET_NOT_ALLOWED',
  RECIPIENT_NOT_ALLOWED: 'RECIPIENT_NOT_ALLOWED',
  PAYMENT_LIMIT_EXCEEDED: 'PAYMENT_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  TOTAL_ALLOWANCE_EXCEEDED: 'TOTAL_ALLOWANCE_EXCEEDED',
  HUMAN_APPROVAL_REQUIRED: 'HUMAN_APPROVAL_REQUIRED',
  REPLAYED_REQUEST: 'REPLAYED_REQUEST',
  INVALID_REQUEST: 'INVALID_REQUEST'
});

const sameAddress = (a, b) => a?.toLowerCase() === b?.toLowerCase();
const normalizeAsset = asset => String(asset || 'ETH').toUpperCase();
export const policyRecipients = policy => {
  const candidates = Array.isArray(policy?.recipients) ? policy.recipients : [policy?.recipient];
  return [...new Set(candidates.filter(value => typeof value === 'string').map(value => value.toLowerCase()))];
};

export function evaluatePayment(policy, request, ledger = [], now = Date.now()) {
  if (policy.status !== 'active' || policy.revokedAt) return { allowed: false, reason: PolicyReason.REVOKED };
  if (now >= Number(policy.expiresAt)) return { allowed: false, reason: PolicyReason.EXPIRED };
  if (String(request.chainId) !== String(policy.chainId)) return { allowed: false, reason: PolicyReason.WRONG_CHAIN };
  if (normalizeAsset(request.asset) !== normalizeAsset(policy.asset)) return { allowed: false, reason: PolicyReason.ASSET_NOT_ALLOWED };
  if (!policyRecipients(policy).some(recipient => sameAddress(request.recipient, recipient))) return { allowed: false, reason: PolicyReason.RECIPIENT_NOT_ALLOWED };
  if (typeof request.requestId !== 'string' || request.requestId.length < 8 || request.requestId.length > 128) return { allowed: false, reason: PolicyReason.INVALID_REQUEST };
  if (ledger.some(item => item.requestId === request.requestId && !(item.status === 'blocked' && item.reason === PolicyReason.HUMAN_APPROVAL_REQUIRED))) {
    return { allowed: false, reason: PolicyReason.REPLAYED_REQUEST };
  }

  let amount;
  try { amount = BigInt(request.amountWei); } catch { return { allowed: false, reason: PolicyReason.INVALID_REQUEST }; }
  if (amount <= 0n) return { allowed: false, reason: PolicyReason.INVALID_REQUEST };
  if (amount > BigInt(policy.perPaymentWei)) return { allowed: false, reason: PolicyReason.PAYMENT_LIMIT_EXCEEDED };
  const dayStart = now - (now % 86_400_000);
  const policySpend = ledger
    .filter(item => ['pending', 'confirmed'].includes(item.status)
      && Number(item.chainId) === Number(policy.chainId)
      && item.smartAccount?.toLowerCase() === policy.smartAccount?.toLowerCase()
      && normalizeAsset(item.asset) === normalizeAsset(policy.asset)
      && item.policyId === policy.policyId)
    .reduce((sum, item) => sum + BigInt(item.amountWei), 0n);
  const totalAllowance = BigInt(policy.onchainAllowanceWei || policy.dailyLimitWei);
  if (policySpend + amount > totalAllowance) {
    return { allowed: false, reason: PolicyReason.TOTAL_ALLOWANCE_EXCEEDED, totalSpent: policySpend.toString() };
  }
  const spentToday = ledger
    .filter(item => ['pending', 'confirmed'].includes(item.status)
      && item.timestamp >= dayStart && item.timestamp <= now
      && Number(item.chainId) === Number(policy.chainId)
      && item.smartAccount?.toLowerCase() === policy.smartAccount?.toLowerCase()
      && normalizeAsset(item.asset) === normalizeAsset(policy.asset)
      && item.policyId === policy.policyId)
    .reduce((sum, item) => sum + BigInt(item.amountWei), 0n);
  if (spentToday + amount > BigInt(policy.dailyLimitWei)) {
    return { allowed: false, reason: PolicyReason.DAILY_LIMIT_EXCEEDED, spentToday: spentToday.toString() };
  }
  if (policy.approvalThresholdWei && amount > BigInt(policy.approvalThresholdWei) && request.humanApprovalVerified !== true) {
    return { allowed: false, reason: PolicyReason.HUMAN_APPROVAL_REQUIRED };
  }
  return { allowed: true, reason: PolicyReason.APPROVED, spentToday: spentToday.toString() };
}
