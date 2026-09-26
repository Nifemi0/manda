import { createPublicClient, erc20Abi, formatEther, formatUnits, http, isAddress } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { robinhoodTestnet } from '@alchemy/common/chains';
import { getUSDGAddress } from '../frontend/assets.js';

const smartAccount = process.argv[2];
if (!isAddress(smartAccount || '')) {
  console.error('Usage: node scripts/check-chain-readiness.mjs <smart-account-address>');
  process.exitCode = 1;
} else {
  const networks = [
    [arbitrumSepolia, 'https://sepolia-rollup.arbitrum.io/rpc'],
    [robinhoodTestnet, 'https://rpc.testnet.chain.robinhood.com']
  ];
  for (const [chain, rpc] of networks) {
    const client = createPublicClient({ chain, transport: http(rpc) });
    const token = getUSDGAddress(chain.id);
    try {
      const [code, nativeBalance, tokenBalance, symbol, decimals] = await Promise.all([
        client.getCode({ address: smartAccount }),
        client.getBalance({ address: smartAccount }),
        client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [smartAccount] }),
        client.readContract({ address: token, abi: erc20Abi, functionName: 'symbol' }),
        client.readContract({ address: token, abi: erc20Abi, functionName: 'decimals' })
      ]);
      console.log(JSON.stringify({ chain: chain.name, chainId: chain.id, smartAccount, deployed: Boolean(code && code !== '0x'), nativeEth: formatEther(nativeBalance), token, tokenSymbol: symbol, tokenDecimals: decimals, tokenBalance: formatUnits(tokenBalance, decimals) }));
    } catch (error) {
      console.error(JSON.stringify({ chain: chain.name, chainId: chain.id, error: error.shortMessage || error.message }));
      process.exitCode = 1;
    }
  }
}
