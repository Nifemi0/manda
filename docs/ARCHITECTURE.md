# Architecture

## System overview

```text
Human owner ───────────────┐
                           ▼
                    Web application
                           │
AI agent ── delegated key ─┤
                           ▼
                Shared smart-account identity
                    │                 │
                    ▼                 ▼
          Arbitrum Sepolia     Robinhood testnet
                    │                 │
                    └──── activity indexer ────► unified feed

Optional: chain router ──► bridge/rebalancer ──► destination chain
```

## Identity and control model

- The human key is the root authority for the smart account.
- The agent uses a separate delegated or session key.
- A permission policy limits the agent by maximum payment, daily runtime spend, approved targets, allowed functions, token, chain, and expiry.
- The Alchemy native-token hook is a cumulative onchain safety ceiling. It decreases after transfers and is not described as a daily-resetting allowance.
- The human can revoke the delegated key at any time.
- Events record the initiating principal so the interface can distinguish human and agent activity.

Each chain enforces its own account and policy state. The application presents them as one product identity, but it must not imply that state is automatically synchronized unless a synchronization mechanism has been implemented and verified.

## Transaction flow

1. A trusted AI runtime authenticates with the local agent token, or the owner opens a short-lived wallet-signed browser session for the demo.
2. The policy engine validates the initiator, positive amount, destination, chain, replay ID, daily reservation, remaining allowance, and expiry.
3. The smart account creates an ERC-4337 UserOperation.
4. A bundler submits the operation.
5. A paymaster sponsors gas under an abuse-limited policy.
6. The application records the result and refreshes the unified feed.

Gasless means the end user does not pay native gas. The application or sponsor still funds the paymaster.

## Chain integrations

### Robinhood Chain testnet

- Use ERC-4337 smart accounts.
- Use Alchemy Bundler and Gas Manager for gas sponsorship.
- Verify the selected test token, faucet, addresses, and explorer before implementation.
- Consider USDG only after confirming testnet availability and required token behavior.

### Arbitrum Sepolia

- Deploy the same account and permission model.
- Use a compatible ERC-4337 bundler and paymaster.
- Evaluate Arbitrum MPP for a USDC authorization-based payment proof.
- Do not claim the MPP flow works on Robinhood Chain until its chain and token support are tested.

## Cross-chain routing

The payment router selects a chain using recipient support, token balance, cost, and expected confirmation time. If the selected chain lacks liquidity, it can offer or initiate a bridge-and-pay operation.

For the hackathon demo, both accounts should be pre-funded. Bridging is an enhancement because it adds latency, liquidity, relayer, and failure-state complexity.

## Components

- **Web application:** onboarding, identity, policy editor, payment request, balances, and activity feed.
- **Smart-account layer:** human ownership, delegated execution, validation, and revocation.
- **Policy module:** amount, velocity, recipient, function, token, chain, and expiry checks.
- **Paymaster integration:** sponsored gas with per-user and per-action controls.
- **Agent adapter:** exposes a narrow payment tool to the personal AI agent.
- **Indexer/API:** normalizes activity from both chains.
- **Router:** chooses a chain and optionally requests rebalancing.

## Security boundaries

- Never give the agent the human's root private key.
- Enforce critical spending constraints onchain or in the smart-account validation path.
- Treat frontend-only limits as presentation, not security.
- Scope paymaster policies to approved contracts and functions and apply rate limits.
- Prevent replay across chains by including chain ID and account context in signed permissions.
- Store no production secrets in the repository.
- Pin the local service to one owner. Multi-owner hosting requires a database and isolated signer/policy/ledger namespaces and is outside this prototype.
- Keep Alchemy keys and Gas Manager policy IDs behind the server proxy; never compile them into browser assets.
- Require an owner signature to register or replace a policy. High-value payment approvals bind the policy, request ID, account, chain, recipient, amount, and expiry.
- Serialize payment decisions and persist a pending reservation before submitting a UserOperation so concurrent requests cannot overspend the runtime budget.

## Decisions still requiring implementation validation

- Production persistence and multi-user isolation beyond the single-owner hackathon prototype.
- Arbitrum value-payment evidence through the Candide paymaster.
- Test token and faucet on Robinhood testnet.
- Whether MPP supports the desired Robinhood deployment and token.
- Bridge provider, only if the optional rebalancer is built.

