# Manda Hackathon Scope

Status: **Locked for the first working prototype**
Locked on: 2026-09-19

## Product promise

One payment identity lets a person safely authorize an AI agent to make small, gas-sponsored payments across Arbitrum and Robinhood Chain without giving the agent unrestricted wallet access.

## Judge-facing story

The judge sees one owner, one agent, one policy, and two chains:

1. The owner opens the payment-control dashboard.
2. The owner chooses a $1 per-payment cap, a $5 UTC daily budget, and a separate cumulative onchain total cap. Those amounts come from the user's account; the paymaster sponsors eligible gas only.
3. The agent purchases a $0.10 API call. The payment succeeds with sponsored gas.
4. The agent attempts a $20 payment. The policy blocks it and explains why.
5. The owner revokes the agent.
6. The interface shows attributed activity and real testnet evidence.
7. A network panel proves that the product supports Arbitrum Sepolia and Robinhood Chain testnet.

## Required deliverables

### Working application

- Responsive web dashboard.
- Human-owned smart account connection or creation.
- One registered AI agent with a separate delegated key.
- Policy editor with selected asset, asset-denominated per-payment cap, UTC daily budget, cumulative lifetime cap, approved recipient, expiry, and revocation.
- Agent-triggered payment to one demo service.
- Sponsored transaction path.
- Unified activity feed with human or agent attribution, network, status, reason, and explorer link.
- Network balance panel for Arbitrum Sepolia and Robinhood Chain testnet.

### Onchain proof

- A deployed account or policy integration on Arbitrum Sepolia.
- A deployed account or policy integration on Robinhood Chain testnet.
- At least one successful sponsored payment on each target network.
- Evidence that an invalid agent action is rejected by the actual authorization path.
- Revocation proof showing that the former delegated key can no longer execute.

### Submission evidence

- Contract and account addresses.
- Explorer links and transaction hashes.
- Automated tests for policy boundaries and revocation.
- Honest testing-status document.
- A 60–90 second demo recording.
- A concise architecture diagram and reproducible setup instructions.

## Core product surfaces

Only four application surfaces are required:

1. **Control dashboard** — identity, balances, active agent, allowance, and primary demo actions.
2. **Permission drawer** — create, edit, inspect, and revoke the agent policy.
3. **Payment execution panel** — submit the approved and excessive demo payments and show their policy evaluation.
4. **Activity ledger** — attributed cross-chain activity with status and evidence links.

These may be implemented as one dashboard with drawers and panels rather than separate routes.

## Technical boundaries

- Use ERC-4337 smart accounts and sponsored UserOperations.
- Start with the Robinhood Chain Alchemy path because official bundler and Gas Manager support is documented.
- Establish a compatible Arbitrum Sepolia bundler and paymaster path.
- Keep native ETH supported as the baseline and offer USDG only at the official Paxos testnet contracts on Arbitrum Sepolia and Robinhood Chain Testnet.
- Keep security-critical permission checks in the account validation or contract path.
- Pre-fund testnet balances so the live demo does not depend on bridging.

## Explicitly deferred

- Automatic bridge execution.
- Automatic cross-chain balance rebalancing.
- A marketplace or service-discovery directory.
- Multiple agents per identity.
- Multiple owners or organizational approval flows.
- Fiat onboarding, KYC, subscriptions, invoices, escrow, and dispute resolution.
- Production mainnet deployment.
- A general-purpose agent SDK.
- Mobile application.
- Product naming and full brand campaign.

The interface may preview cross-chain routing as a disabled or clearly labeled future capability. It must not represent an unimplemented bridge as functional.

## Completion gate

The prototype is ready for submission only when:

- The approved payment succeeds through the real delegated authorization path.
- The excessive payment fails for the intended policy reason.
- Revocation prevents another agent operation.
- Both target networks have verifiable evidence.
- The frontend communicates the complete story without terminal narration.
- The demo can run twice from a prepared state without manual database edits.

## Change rule

New required features may enter this scope only if they replace an existing deliverable or the required demo is already stable and evidenced. Optional bridging remains last.
