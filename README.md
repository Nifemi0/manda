# Manda

**Give agents permission, not your wallet.**

This project is a programmable payment identity shared safely between a person and their personal AI agent. The person owns the account; the agent can make gas-sponsored payments only within explicit, revocable rules.

## Why it exists

Personal agents need to pay for APIs, data, compute, and digital services without receiving unrestricted control of a wallet. The product combines a human-controlled smart account with constrained agent permissions, visible attribution, and a unified experience across Arbitrum and Robinhood Chain.

## Core capabilities

- Shared human-agent payment identity.
- Limited and revocable agent spending authority.
- Gas-sponsored ERC-4337 payments.
- Arbitrum Sepolia and Robinhood Chain testnet support.
- Unified multi-chain balances and activity.
- Optional background routing and rebalancing.

## Demo promise

The agent completes a small approved payment, a larger unauthorized payment is blocked, the activity feed explains both outcomes, and the human revokes the agent's authority. The product demonstrates real testnet activity on both supported chains.

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Product design](docs/DESIGN.md)
- [Locked scope](docs/SCOPE.md)
- [Frontend direction](docs/FRONTEND-DIRECTION.md)
- [Build tasks](docs/TASKS.md)
- [Project memory](memory.md)

## Current status

The landing page, wallet-aware onboarding, control room, dual-chain Modular Account V2 deployment, delegated mandate, authenticated agent service, sponsored payments on Robinhood Chain Testnet and Arbitrum Sepolia, and policy rejection path are implemented. Live revocation evidence, optional bridge selection, and the final submission package remain.

## Local development

Copy `.env.example` to `.env.local`, add the Alchemy application key and Gas Manager policy ID, then run `npm install`, `npm run dev`, and `npm run agent:serve`. Browser code never receives those credentials. The agent service creates an ignored `.agent-api-token.local` for trusted AI runtimes; browser demo sessions instead require a short-lived owner signature.

For a built Node deployment, run `npm run build`, `npm run agent:serve`, and `npm start`. The production server serves `dist` and keeps the Alchemy and agent proxies server-side; a static-only host is not sufficient for the authenticated product routes.


