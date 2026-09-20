# Manda Project Memory

Last updated: 2026-09-20

## Locked decisions

- The product name is **Manda**.
- The primary line is **Give agents permission, not your wallet.**
- Every public page now uses the Manda brand, shared navigation targets, and a detailed footer linking the product, documentation, source repository, and verified network evidence.
- The public documentation route is `frontend/docs.html`; the source documentation index is `docs/README.md`; machine-readable product context is served from `/llms.txt` via `public/llms.txt`.
- The agent integration route is `frontend/agent.html`. It detects service health, verifies a short-lived owner session, reads the private policy endpoint, and generates copy-ready JavaScript, Python, cURL, and tool-schema adapters without displaying secrets.
- Build a payment product rather than a freelance marketplace.
- The central concept is one programmable financial identity shared between a human and their personal AI agent.
- The human is the root owner.
- The agent receives constrained, time-bound, and revocable payment authority.
- The activity feed must identify whether a human or agent initiated each action.
- Gas-sponsored payments are part of the core experience.
- Support Arbitrum Sepolia and Robinhood Chain testnet in one cohesive product.
- The product should work independently on each chain.
- Cross-chain routing or bridging is optional and must not be required for the main demo.
- The key demonstration is an allowed small agent payment, a blocked excessive payment, and immediate revocation.
- The first prototype deliverables are locked in `docs/SCOPE.md`.
- The frontend direction is locked as **Authority Console** in `docs/FRONTEND-DIRECTION.md`.
- The required UI is one responsive dashboard with a dual-network balance, Authority Card, payment test controls, and attributed activity ledger.
- The approved visual path uses a deep teal environment, warm paper panels, and a crimson authority card, informed by Daybreak and the supplied Brave wallpaper reference.
- The frontend lives under `frontend/`. Seeded identities, balances, policies, transactions, simulation logic, and screenshots containing them were removed on 2026-09-19.
- The product surface now starts disconnected and empty. It must display records only after they come from a real wallet, policy, or verified chain event.
- Standing visual rule: pages must be content-rich and explain the product in detail; avoid sparse layouts. Top navigation must visually merge into the hero section.
- The approved content-rich depth direction is now the primary landing page at `frontend/index.html`.
- The earlier root landing is preserved at `frontend/landing-original.html`; `frontend/deep.html` remains the working comparison source.
- The root frontend route is the public landing page. The interactive product dashboard is a separate demo surface at `frontend/app.html`.
- The landing CTAs now enter the four-step setup flow at `frontend/onboarding.html`; it covers owner connection, smart-account creation, agent mandate design, and final review without claiming any onchain action.
- The control room at `frontend/app.html` now presents ownership, mandate, balances, attributed activity, controls, and the two-network architecture entirely through truthful disconnected and empty states.
- The frontend now has a dependency-free EIP-1193 wallet adapter at `frontend/wallet.js`. It reads the public owner address and active chain, reacts to wallet changes, and can switch or add Arbitrum Sepolia and Robinhood Chain Testnet.
- Connected owner state is session-scoped and shown in onboarding and the control room. Connecting does not request a signature or submit an onchain action.
- The connected flow was exercised in Chrome on Arbitrum Sepolia. Multi-wallet provider selection now prefers an already-authorized provider on a supported chain, keeping onboarding and control-room network state consistent.
- Mandate inputs now appear in final review as an explicitly unsigned draft; no policy is described as active before an onchain authorization exists.
- The frontend now builds with Vite and the Alchemy Modular Account V2 SDK. On Arbitrum Sepolia it can derive the connected owner's counterfactual account, check deployment state, and submit a sponsored first UserOperation after configuration.
- Required runtime configuration is documented in `.env.example`: `VITE_ALCHEMY_API_KEY` and `VITE_ALCHEMY_GAS_POLICY_ID`. Neither credential is committed or currently available in the environment.
- Automatic bridging, multiple agents, marketplace features, and broad SDK work are deferred until the two-chain proof is stable.

## Positioning

Working thesis:

> One programmable financial identity shared safely between a human and their AI agent, with gas-sponsored payments across Arbitrum and Robinhood Chain.

The product differs from Fiverr and other freelance platforms because it is payment and permission infrastructure for people and agents. It does not match clients with freelancers, host gigs, or manage marketplace disputes.

## Technical direction recorded

- Use ERC-4337 smart accounts.
- Verified network configuration: Arbitrum Sepolia chain ID 421614 (`0x66eee`), public RPC `https://sepolia-rollup.arbitrum.io/rpc`; Robinhood Chain Testnet chain ID 46630 (`0xb626`), public RPC `https://rpc.testnet.chain.robinhood.com`.
- Use a separate delegated or session key for the agent.
- Enforce payment cap, daily allowance, approved services or recipients, token, chain, and expiry.
- Use Alchemy's supported bundler and Gas Manager path on Robinhood Chain.
- Establish an ERC-4337 paymaster path on Arbitrum Sepolia.
- Explore Arbitrum MPP for a compatible USDC payment flow.
- Treat MPP support on Robinhood Chain as unverified until it is tested.
- Pre-fund both testnet accounts for a reliable demo.
- If implemented, use bridging for background rebalancing rather than as a dependency of every payment.

## Hackathon strategy recorded

- Present one coherent product with meaningful deployments on both networks.
- Target the general product track while demonstrating direct Robinhood Chain relevance.
- Sponsor alignment under consideration includes Robinhood Chain, Alchemy, Arbitrum infrastructure, OpenZeppelin, and possibly USDG after compatibility checks.
- Multi-chain support may improve eligibility, but it does not guarantee multiple prizes.
- The hackathon is expected to judge a working prototype; existing users are not assumed to be required, but final official rules still need confirmation.

## Unverified items

- Final event rules, deadlines, and whether prizes can be stacked.
- Robinhood testnet token and faucet availability.
- USDG behavior and availability in the intended test environment.
- MPP deployment and token compatibility on Robinhood Chain.
- Bridge provider and bridge UX.
- Final name, branding, contract addresses, deployments, and users.

## Source-of-truth rule

The files in `docs/` define the current product plan. This memory records conversation decisions and unresolved questions. Update both when a decision changes. Do not convert an unverified item into a product claim without evidence.

## Verified implementation state

- 2026-09-20: Deployed the human-owned Modular Account V2 at `0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE` on Arbitrum Sepolia through Candide's public sponsored ERC-4337 endpoint.
- The onboarding UI reported deployment transaction `0x0798…e367`; the public Arbitrum Sepolia RPC independently returned non-empty runtime bytecode for the account.
- The app now persists verified smart-account state and renders it in the control room. Future deployments retain full UserOperation and transaction hashes.
- 2026-09-20: The same Modular Account V2 address was deployed on Robinhood Chain Testnet, entity `1` was installed on both chains, and a sponsored Robinhood agent payment was confirmed.
- 2026-09-20 security review: the agent API now requires a wallet-signed owner session or an ignored server-side AI token. Policy registration and high-value approval messages are cryptographically bound to their complete context.
- Payment decisions are serialized, pending spend is reserved before submission, ledger writes are atomic, and daily totals are scoped by chain, smart account, and policy evidence.
- The UI and documentation distinguish the runtime daily budget from Alchemy's cumulative onchain native-token ceiling. The live Robinhood ceiling has `4599999999999` wei remaining after the verified payment and the `1 wei` audit transaction.
- Revocation now selects the active policy chain. Robinhood uninstall support is implemented, while live revocation evidence remains intentionally pending so the current agent mandate stays usable.
- Alchemy credentials and the gas policy ID were removed from browser assets and moved behind development and production server proxies.
- 2026-09-20 hardened dual-chain retest: an authenticated `1 wei` Robinhood payment confirmed in transaction `0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3`; the authenticated Arbitrum request was blocked before submission with `BALANCE_FLOOR_BREACH` because the Arbitrum balance is zero.
- After the Arbitrum smart account was funded with `0.026 ETH`, an authenticated `1 wei` Candide-sponsored agent payment confirmed in transaction `0xde404f32df06016fe3f2c97afb028cf853246c479258547270fadf4443b2c1d8` and UserOperation `0xfaeec686e9f9cd82b58927a6be21d8326e1ac36499b71fdeff40178e82f5e503`.
