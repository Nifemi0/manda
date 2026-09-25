import { createPublicClient, createWalletClient, custom, http, toFunctionSelector, zeroAddress } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { createBundlerClient, createPaymasterClient } from 'viem/account-abstraction';
import {
  AllowlistModule, DefaultModuleAddress, NativeTokenLimitModule, PermissionBuilder, PermissionType,
  SingleSignerValidationModule, TimeRangeModule, installValidationActions, toModularAccountV2
} from '@alchemy/smart-accounts';
import { ERC20_HOOK_ENTITY_OFFSET, normalizeAsset } from './assets.js';

const bundlerUrl = import.meta.env.VITE_BUNDLER_URL?.trim() || 'https://api.candide.dev/public/v3/arbitrum-sepolia';
const usesAlchemyPolicy = bundlerUrl.startsWith('/api/alchemy');
let smartAccount;
let bundlerClient;
let paymasterClient;

export const smartAccountConfig = {
  apiKeyReady: true,
  sponsorshipReady: true,
  chain: arbitrumSepolia
};

export async function prepareSmartAccount(ownerAddress) {
  const provider = MandaWallet.getProvider();
  if (!provider) throw new Error('Connect the owner wallet first.');
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (chainId !== '0x66eee') throw new Error('Switch the connected wallet to Arbitrum Sepolia first.');
  const rpcTransport = http('https://sepolia-rollup.arbitrum.io/rpc');
  const bundlerTransport = http(bundlerUrl);
  const walletClient = createWalletClient({ account: ownerAddress, chain: arbitrumSepolia, transport: custom(provider) });
  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: rpcTransport });
  smartAccount = await toModularAccountV2({ client: walletClient, owner: walletClient.account });
  paymasterClient = createPaymasterClient({ chain: arbitrumSepolia, transport: bundlerTransport });
  bundlerClient = createBundlerClient({
    account: smartAccount,
    chain: arbitrumSepolia,
    transport: bundlerTransport,
    userOperation: { estimateFeesPerGas: () => publicClient.estimateFeesPerGas() },
    paymaster: paymasterClient,
    paymasterContext: {}
  });
  const code = await publicClient.getCode({ address: smartAccount.address });
  return { address: smartAccount.address, deployed: Boolean(code && code !== '0x'), sponsored: smartAccountConfig.sponsorshipReady };
}

export async function deploySmartAccount() {
  if (!smartAccount || !bundlerClient) throw new Error('Prepare the smart account before deployment.');
  if (!smartAccountConfig.sponsorshipReady) throw new Error('Configure a gas policy before requesting a sponsored deployment.');
  const userOperationHash = await bundlerClient.sendUserOperation({ calls: [{ to: zeroAddress, value: 0n, data: '0x' }] });
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash });
  return { address: smartAccount.address, userOperationHash, transactionHash: receipt.receipt.transactionHash };
}

export async function installAgentPolicy({ agentAddress, recipient, recipients, dailyLimitWei, onchainAllowanceWei = dailyLimitWei, expiresAt, entityId = 1, asset = 'ETH', tokenAddress }) {
  if (!smartAccount || !bundlerClient) throw new Error('Prepare the smart account before installing a mandate.');
  const validUntil = Math.floor(new Date(expiresAt).getTime() / 1000);
  const timeHook = TimeRangeModule.buildHook({ entityId, validUntil, validAfter: 0 }, DefaultModuleAddress.TIME_RANGE);
  const builder = new PermissionBuilder({
    client: bundlerClient,
    key: { publicKey: agentAddress, type: 'secp256k1' },
    entityId,
    nonce: 0n,
    hooks: [timeHook]
  });
  const recipientSet = [...new Set((recipients || [recipient]).filter(Boolean).map(address => address.toLowerCase()))];
  if (!recipientSet.length || recipientSet.length > 32) throw new Error('A mandate must have between 1 and 32 recipients.');
  const permissions = normalizeAsset(asset) === 'USDG'
    ? [
      { type: PermissionType.NATIVE_TOKEN_TRANSFER, data: { allowance: '0x0' } },
      { type: PermissionType.ERC20_TOKEN_TRANSFER, data: { address: tokenAddress, allowance: `0x${BigInt(onchainAllowanceWei).toString(16)}` } }
    ]
    : [
      { type: PermissionType.NATIVE_TOKEN_TRANSFER, data: { allowance: `0x${BigInt(onchainAllowanceWei).toString(16)}` } },
      ...recipientSet.map(address => ({ type: PermissionType.CONTRACT_ACCESS, data: { address } }))
    ];
  builder.addPermissions({ permissions });
  const callData = await builder.compileRaw();
  // Candide's sponsorship response carries a short validity window. Prepare the
  // operation with stub data, ask the owner to sign, then refresh final paymaster
  // data after the signature so a slow wallet confirmation cannot expire it.
  const parameters = ['factory', 'fees', 'nonce', 'signature', 'authorization'];
  let request = await bundlerClient.prepareUserOperation({ account: smartAccount, callData, parameters });
  const paymasterArgs = {
    chainId: arbitrumSepolia.id,
    entryPointAddress: smartAccount.entryPoint.address,
    context: {},
    ...request
  };
  const stub = await paymasterClient.getPaymasterStubData(paymasterArgs);
  request = { ...request, ...stub };
  const gas = await bundlerClient.estimateUserOperationGas({
    // Supplying a null account prevents viem from re-preparing the operation
    // and requesting fresh paymaster data before the owner signs.
    account: null,
    sender: smartAccount.address,
    entryPointAddress: smartAccount.entryPoint.address,
    callGasLimit: 0n,
    preVerificationGas: 0n,
    verificationGasLimit: 0n,
    paymasterPostOpGasLimit: 0n,
    paymasterVerificationGasLimit: 0n,
    ...request
  });
  request = { ...request, ...gas };
  const finalPaymaster = await paymasterClient.getPaymasterData({
    chainId: arbitrumSepolia.id,
    entryPointAddress: smartAccount.entryPoint.address,
    context: {},
    ...request
  });
  request = { ...request, ...finalPaymaster };
  const signature = await smartAccount.signUserOperation(request);
  request = { ...request, signature, parameters };
  const userOperationHash = await bundlerClient.sendUserOperation(request);
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash });
  return { entityId, validUntil, userOperationHash, transactionHash: receipt.receipt.transactionHash };
}

export async function revokeAgentPolicy({ entityId = 1, recipient, recipients, asset = 'ETH', tokenAddress }) {
  if (!smartAccount || !bundlerClient) throw new Error('Prepare the smart account before revoking a mandate.');
  const uninstallData = SingleSignerValidationModule.encodeOnUninstallData({ entityId });
  const hookUninstallDatas = [TimeRangeModule.encodeOnUninstallData({ entityId })];
  if (normalizeAsset(asset) === 'USDG') {
    const transferSelector = toFunctionSelector('transfer(address,uint256)');
    const approveSelector = toFunctionSelector('approve(address,uint256)');
    hookUninstallDatas.push(
      NativeTokenLimitModule.encodeOnUninstallData({ entityId }),
      AllowlistModule.encodeOnUninstallData({ entityId: entityId + ERC20_HOOK_ENTITY_OFFSET, inputs: [{
        target: tokenAddress, hasSelectorAllowlist: false, hasERC20SpendLimit: true, erc20SpendLimit: 0n, selectors: []
      }] }),
      AllowlistModule.encodeOnUninstallData({ entityId, inputs: [
        ...[...new Set((recipients || [recipient]).filter(Boolean))].map(target => ({ target, hasSelectorAllowlist: false, hasERC20SpendLimit: false, erc20SpendLimit: 0n, selectors: [] })),
        { target: tokenAddress, hasSelectorAllowlist: true, hasERC20SpendLimit: false, erc20SpendLimit: 0n, selectors: [approveSelector, transferSelector] }
      ] })
    );
  } else {
    hookUninstallDatas.push(
      NativeTokenLimitModule.encodeOnUninstallData({ entityId }),
      AllowlistModule.encodeOnUninstallData({ entityId, inputs: [...new Set((recipients || [recipient]).filter(Boolean))].map(target => ({
        target, hasSelectorAllowlist: false, hasERC20SpendLimit: false, erc20SpendLimit: 0n, selectors: []
      })) })
    );
  }
  const callData = await installValidationActions(bundlerClient).encodeUninstallValidation({
    moduleAddress: DefaultModuleAddress.SINGLE_SIGNER_VALIDATION,
    entityId,
    uninstallData,
    hookUninstallDatas,
    account: smartAccount
  });
  const userOperationHash = await bundlerClient.sendUserOperation({ callData });
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash });
  return { userOperationHash, transactionHash: receipt.receipt.transactionHash };
}
