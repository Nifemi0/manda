import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { robinhoodTestnet } from '@alchemy/common/chains';
import { DefaultModuleAddress, NativeTokenLimitModule, TimeRangeModule, serializeModuleEntity } from '@alchemy/smart-accounts';

const account = '0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE';
const abi = [{ type: 'function', name: 'getValidationData', stateMutability: 'view', inputs: [{ name: 'validationFunction', type: 'bytes24' }], outputs: [{ name: 'data', type: 'tuple', components: [{ name: 'validationFlags', type: 'uint8' }, { name: 'validationHooks', type: 'bytes25[]' }, { name: 'executionHooks', type: 'bytes25[]' }, { name: 'selectors', type: 'bytes4[]' }] }] }];
const networks = [
  { name: 'Arbitrum Sepolia', chain: arbitrumSepolia, rpc: 'https://sepolia-rollup.arbitrum.io/rpc' },
  { name: 'Robinhood Testnet', chain: robinhoodTestnet, rpc: 'https://rpc.testnet.chain.robinhood.com' }
];

for (const { name, chain, rpc } of networks) {
  const client = createPublicClient({ chain, transport: http(rpc) });
  for (const entityId of [1, 2, 3]) {
    try {
      const result = await client.readContract({ address: account, abi, functionName: 'getValidationData', args: [serializeModuleEntity({ moduleAddress: DefaultModuleAddress.SINGLE_SIGNER_VALIDATION, entityId })] });
      const [timeRange, nativeLimit] = await Promise.all([
        client.readContract({ address: DefaultModuleAddress.TIME_RANGE, abi: TimeRangeModule.abi, functionName: 'timeRanges', args: [entityId, account] }),
        client.readContract({ address: DefaultModuleAddress.NATIVE_TOKEN_LIMIT, abi: NativeTokenLimitModule.abi, functionName: 'limits', args: [BigInt(entityId), account] })
      ]);
      console.log(JSON.stringify({ network: name, entityId, validationFlags: result.validationFlags, validationHooks: result.validationHooks.length, executionHooks: result.executionHooks.length, selectors: result.selectors.length, expiresAt: timeRange[0] ? new Date(Number(timeRange[0]) * 1000).toISOString() : null, nativeLimitWei: nativeLimit.toString() }));
    } catch (error) {
      console.log(JSON.stringify({ network: name, entityId, error: error.shortMessage || error.message }));
    }
  }
}
