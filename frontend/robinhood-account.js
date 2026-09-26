import { createPublicClient, createWalletClient, custom, http, toFunctionSelector, zeroAddress } from 'viem';
import { createBundlerClient } from 'viem/account-abstraction';
import { robinhoodTestnet } from '@alchemy/common/chains';
import {
  AllowlistModule, DefaultModuleAddress, NativeTokenLimitModule, PermissionBuilder, PermissionType,
  SingleSignerValidationModule, TimeRangeModule, installValidationActions, toModularAccountV2
} from '@alchemy/smart-accounts';
import { ERC20_HOOK_ENTITY_OFFSET, normalizeAsset } from './assets.js';
import { nextAvailableEntityId } from './mandate-entity.js';

const bundlerUrl = '/api/robinhood';
let smartAccount;
let bundlerClient;

export const robinhoodAccountConfig = { apiKeyReady: true, sponsorshipReady: true, chain: robinhoodTestnet };

export async function nextRobinhoodPolicyEntityId(firstCandidate) {
  return nextAvailableEntityId(smartAccount, firstCandidate);
}

export async function prepareRobinhoodAccount(ownerAddress) {
  const provider = MandaWallet.getProvider();
  if (!provider) throw new Error('Connect the owner wallet first.');
  if (await provider.request({ method: 'eth_chainId' }) !== '0xb626') throw new Error('Switch the connected wallet to Robinhood Testnet first.');
  const walletClient = createWalletClient({ account: ownerAddress, chain: robinhoodTestnet, transport: custom(provider) });
  const publicClient = createPublicClient({ chain: robinhoodTestnet, transport: http('https://rpc.testnet.chain.robinhood.com') });
  smartAccount = await toModularAccountV2({ client: walletClient, owner: walletClient.account });
  bundlerClient = createBundlerClient({
    account: smartAccount,
    chain: robinhoodTestnet,
    transport: http(bundlerUrl),
    userOperation: { estimateFeesPerGas: () => publicClient.estimateFeesPerGas() }
  });
  const code = await publicClient.getCode({ address: smartAccount.address });
  return { address: smartAccount.address, deployed: Boolean(code && code !== '0x'), sponsored: true };
}

const sponsoredParameters = ['factory', 'fees', 'gas', 'nonce', 'signature', 'authorization'];

async function prepareSponsoredOperation(operation) {
  // Alchemy's gas policy sponsors the fees, but the EntryPoint still needs
  // real execution and verification limits for validation-heavy operations
  // such as installing a permission module.
  const request = await bundlerClient.prepareUserOperation({
    account: smartAccount,
    parameters: sponsoredParameters,
    ...operation
  });
  return { ...request, maxFeePerGas: 0n, maxPriorityFeePerGas: 0n };
}

export async function deployRobinhoodAccount() {
  if (!smartAccount || !bundlerClient) throw new Error('Prepare the Robinhood smart account before deployment.');
  const request = await prepareSponsoredOperation({ calls: [{ to: zeroAddress, value: 0n, data: '0x' }] });
  const signature = await smartAccount.signUserOperation(request);
  const userOperationHash = await bundlerClient.sendUserOperation({ ...request, signature, parameters: sponsoredParameters });
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash });
  return { address: smartAccount.address, userOperationHash, transactionHash: receipt.receipt.transactionHash };
}

export async function installRobinhoodPolicy({ agentAddress, recipient, recipients, dailyLimitWei, onchainAllowanceWei = dailyLimitWei, expiresAt, entityId = 1, asset = 'ETH', tokenAddress }) {
  if (!smartAccount || !bundlerClient) throw new Error('Prepare the Robinhood smart account before installing a mandate.');
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
  const request = await prepareSponsoredOperation({ callData });
  const signature = await smartAccount.signUserOperation(request);
  const userOperationHash = await bundlerClient.sendUserOperation({ ...request, signature, parameters: sponsoredParameters });
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash });
  return { entityId, validUntil, userOperationHash, transactionHash: receipt.receipt.transactionHash };
}

export async function revokeRobinhoodPolicy({ entityId = 1, recipient, recipients, asset = 'ETH', tokenAddress }) {
  if (!smartAccount || !bundlerClient) throw new Error('Prepare the Robinhood smart account before revoking a mandate.');
  const hookUninstallDatas = [TimeRangeModule.encodeOnUninstallData({ entityId })];
  if (normalizeAsset(asset) === 'USDG') {
    const transferSelector = toFunctionSelector('transfer(address,uint256)');
    const approveSelector = toFunctionSelector('approve(address,uint256)');
    hookUninstallDatas.push(
      NativeTokenLimitModule.encodeOnUninstallData({ entityId }),
      AllowlistModule.encodeOnUninstallData({ entityId: entityId + ERC20_HOOK_ENTITY_OFFSET, inputs: [{ target: tokenAddress, hasSelectorAllowlist: false, hasERC20SpendLimit: true, erc20SpendLimit: 0n, selectors: [] }] }),
      AllowlistModule.encodeOnUninstallData({ entityId, inputs: [
        ...[...new Set((recipients || [recipient]).filter(Boolean))].map(target => ({ target, hasSelectorAllowlist: false, hasERC20SpendLimit: false, erc20SpendLimit: 0n, selectors: [] })),
        { target: tokenAddress, hasSelectorAllowlist: true, hasERC20SpendLimit: false, erc20SpendLimit: 0n, selectors: [approveSelector, transferSelector] }
      ] })
    );
  } else {
    hookUninstallDatas.push(
      NativeTokenLimitModule.encodeOnUninstallData({ entityId }),
      AllowlistModule.encodeOnUninstallData({ entityId, inputs: [...new Set((recipients || [recipient]).filter(Boolean))].map(target => ({ target, hasSelectorAllowlist: false, hasERC20SpendLimit: false, erc20SpendLimit: 0n, selectors: [] })) })
    );
  }
  const callData = await installValidationActions(bundlerClient).encodeUninstallValidation({
    moduleAddress: DefaultModuleAddress.SINGLE_SIGNER_VALIDATION,
    entityId,
    uninstallData: SingleSignerValidationModule.encodeOnUninstallData({ entityId }),
    hookUninstallDatas,
    account: smartAccount
  });
  const request = await prepareSponsoredOperation({ callData });
  const signature = await smartAccount.signUserOperation(request);
  const userOperationHash = await bundlerClient.sendUserOperation({ ...request, signature, parameters: sponsoredParameters });
  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOperationHash });
  return { userOperationHash, transactionHash: receipt.receipt.transactionHash };
}
