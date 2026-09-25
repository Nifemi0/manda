# Manda Product Requirements

## Product thesis

The product gives a person and their personal AI agent one programmable payment identity across Arbitrum and Robinhood Chain. The person remains the root owner while the agent receives limited, revocable authority to pay for approved services.

## Problem

AI agents increasingly need to purchase APIs, data, compute, subscriptions, and digital services. Giving an agent a normal wallet creates unacceptable risk, while requiring its owner to approve every small payment removes the agent's autonomy. Existing payment and freelance platforms do not provide a shared human-agent identity with enforceable onchain spending rules.

## Target users

- Developers building personal agents that purchase services.
- People who want an agent to act financially within strict limits.
- Service providers that want verifiable payment from humans and agents.

## Core experience

1. A person creates a shared payment identity and controls its smart account.
2. The person delegates authority to an AI agent.
3. The owner sets a per-payment cap, UTC daily budget, cumulative total delegated cap, approved recipient or service, and expiry.
4. The agent pays for the service from the user's account; Manda's sponsor covers eligible network gas only.
5. A payment outside the rules is rejected.
6. The activity feed identifies whether the person or agent initiated each action.
7. The person can revoke the agent immediately.

## Hackathon demo

The primary demo should take about 60–90 seconds:

1. Create or open one shared payment identity.
2. Fund it with a supported test token.
3. Give the agent a small daily allowance.
4. Let the agent successfully buy a low-cost service without holding gas.
5. Show a larger unauthorized payment being blocked.
6. Show both actions in the unified activity feed.
7. Revoke the agent's authority.
8. Show deployments or transactions on Arbitrum Sepolia and Robinhood Chain testnet.

## Required features

- Human-controlled smart account.
- Delegated agent authorization with amount, time, and destination constraints.
- Gas-sponsored payments.
- Native ETH and optional USDG payments on the two supported testnets, with separate asset-denominated limits.
- Deployment on Arbitrum Sepolia and Robinhood Chain testnet.
- Unified balance and activity interface across both networks.
- Clear human-versus-agent attribution for every action.
- Immediate revocation.

## Optional feature

An under-the-hood bridge or rebalancer may move funds when the selected chain has insufficient balance. It must remain optional so a delayed bridge cannot break the core demo. USDG is an optional testnet payment asset, not a requirement for the core ETH path.

## Out of scope for the first submission

- A freelance marketplace.
- Escrow, dispute resolution, or reputation scoring.
- Fiat on-ramp and off-ramp.
- Autonomous trading.
- Production custody of user funds.
- Supporting more than the two selected chains.

## Success criteria

- A judge can understand the shared human-agent identity in one sentence.
- The authorized payment succeeds without the user holding native gas.
- The unauthorized payment is demonstrably rejected.
- Revocation prevents subsequent agent payments.
- Real testnet transaction evidence exists for both supported chains.
- The demo works without relying on the optional bridge.

## Honest product status

This document records the selected concept and intended scope. It does not claim that contracts, deployments, integrations, or users currently exist.
