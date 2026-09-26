export async function nextAvailableEntityId(account, firstCandidate) {
  if (!account?.getValidationData) throw new Error('Prepare the smart account before choosing a mandate entity.');
  const start = Number(firstCandidate);
  if (!Number.isSafeInteger(start) || start < 1) throw new Error('Invalid mandate entity ID.');
  for (let entityId = start; entityId < start + 32; entityId++) {
    const data = await account.getValidationData({ entityId });
    if (Number(data.validationFlags) === 0 && !data.validationHooks.length && !data.executionHooks.length && !data.selectors.length) return entityId;
  }
  throw new Error('No unused mandate entity found. Revoke old mandates before continuing.');
}
