import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextAvailableEntityId } from '../frontend/mandate-entity.js';

test('skips onchain mandates missing from local storage', async () => {
  const queried = [];
  const account = { async getValidationData({ entityId }) {
    queried.push(entityId);
    return { validationFlags: entityId === 2 ? 1 : 0, validationHooks: entityId === 2 ? ['hook'] : [], executionHooks: [], selectors: [] };
  } };
  assert.equal(await nextAvailableEntityId(account, 2), 3);
  assert.deepEqual(queried, [2, 3]);
});

test('does not guess an entity when onchain inspection fails', async () => {
  await assert.rejects(nextAvailableEntityId({ getValidationData: async () => { throw new Error('RPC unavailable'); } }, 2), /RPC unavailable/);
});
