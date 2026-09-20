# Manda Build Tasks

## Foundation

- [x] Lock the product thesis: shared payment identity for a human and personal AI agent.
- [x] Select Arbitrum Sepolia and Robinhood Chain testnet as target networks.
- [x] Define gas-sponsored payments as a core capability.
- [x] Keep bridging optional and outside the critical demo path.
- [x] Lock the first prototype deliverables and explicit deferrals.
- [x] Lock the Authority Console frontend direction.
- [x] Confirm the official deadline, Arbitrum deployment requirement, judging criteria, and Promising Products/Robinhood reserved-prize fit.
- [x] Lock the product name as Manda.

## Technical validation

- [ ] Confirm faucet and supported test token for both networks.
- [x] Confirm chain IDs, public RPC endpoints, and explorers for Arbitrum Sepolia and Robinhood Chain Testnet.
- [x] Implement and verify the Robinhood Testnet Modular Account V2 sponsored deployment and payment path through Alchemy.
- [x] Implement the Arbitrum Sepolia Modular Account V2 client, counterfactual address preparation, bundler, and sponsored first UserOperation path.
- [x] Configure the Alchemy API key and Gas Manager policy; Alchemy capacity was exhausted, so execute the Arbitrum Sepolia deployment through the verified Candide public bundler/paymaster fallback.
- [x] Test constrained delegated-key authorization through Modular Account V2 validation and hook modules.
- [ ] Validate MPP and token compatibility before including it in product claims.
- [ ] Evaluate a bridge provider only after both standalone payment flows work.

## Contracts and account logic

- [x] Deploy the human-owned Modular Account V2 on Arbitrum Sepolia and independently verify runtime bytecode at the account address.
- [x] Implement delegated agent authorization with a separate key, authenticated service token, and owner-signed browser sessions.
- [x] Enforce per-payment limit, daily runtime allowance, approved target, chain, expiry, replay protection, and a cumulative onchain ceiling.
- [x] Implement chain-aware immediate revocation; live owner-signed revocation evidence remains pending.
- [x] Emit attributed policy-result records in the service ledger.
- [x] Test permitted payment, excessive payment, expiry, unapproved target, replay, invalid input, and revoked state.

## Application

- [x] Build the public narrative landing page with the shared-identity story and demo entry.
- [x] Build the public technical documentation route, source documentation index, and `llms.txt` product map.
- [x] Build the agent connection route with service health, owner-session verification, policy inspection, and copy-ready adapters.
- [x] Add consistent Manda branding, navigation links, network evidence, and detailed footers across every page.
- [x] Promote the content-rich depth direction to the primary landing route.
- [x] Build the four-step onboarding flow for owner, smart account, agent mandate, and review.
- [x] Connect an injected EVM wallet and propagate verified owner and network state into the control room.
- [x] Build the responsive Authority Console shell with truthful disconnected and empty states.
- [x] Build the dual-network balance card.
- [x] Connect the Authority Card to the signed onchain policy and require the connected owner before enabling controls.
- [x] Connect approved-payment and policy-block controls to the authenticated authorization path.
- [x] Populate the attributed activity ledger from policy decisions and verified transaction results.
- [ ] Complete the final accessibility and edge-state review after user visual approval.
- [x] Build identity dashboard.
- [x] Build permission editor.
- [x] Build gas-sponsored payment flow.
- [x] Build unified multi-chain balance view.
- [x] Build human-versus-agent activity feed.
- [x] Add transaction and explorer links.
- [ ] Add optional chain routing.
- [ ] Add optional bridge/rebalance only if time remains.

## Agent integration

- [x] Define a narrow payment tool schema (`requestId`, `chainId`, `recipient`, `amountWei`).
- [x] Keep the delegated secp256k1 key in the local agent service rather than browser storage or tracked source.
- [x] Return actionable success and rejection reasons to the agent.
- [x] Demonstrate an approved purchase and an intentionally blocked purchase.

## Evidence and submission

- [x] Record deployed account addresses and transaction evidence.
- [x] Save transaction hashes for successful flows and policy-ledger evidence for rejected flows.
- [x] Add automated policy-boundary tests and honest testing-status documentation with dual-chain onchain evidence.
- [ ] Capture the 60–90 second demo.
- [ ] Prepare submission copy around one thesis and two core capabilities.
- [ ] Verify the project from a clean environment before submission.

## Recommended build order

1. Connect the owner wallet from the completed onboarding surface.
2. Validate one smart account and gas-sponsored payment on Robinhood Chain testnet.
3. Add constrained agent delegation and revocation.
4. Reproduce the account and payment flow on Arbitrum Sepolia.
5. Replace every empty state with verified account and transaction data.
6. Capture evidence from both chains.
7. Add routing and bridging only if the core demo is stable.
