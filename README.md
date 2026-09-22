# Manda

**Give agents permission, not your wallet.**

This project is a programmable payment identity shared safely between a person and their personal AI agent. The person owns the account; the agent can make gas-sponsored payments only within explicit, revocable rules.

[Open the live product](https://manda-dun.vercel.app/) · [Read the web documentation](https://manda-dun.vercel.app/docs.html) · [Connect an agent](https://manda-dun.vercel.app/agent.html)

[Inspect live proof](https://manda-dun.vercel.app/proof.html) — public service state, active mandates, confirmed receipts, and implementation boundaries without a wallet connection.

![Manda landing page explaining human-controlled agent payments](evidence/original-depth-content-full.png)

## Why it exists

Personal agents need to pay for APIs, data, compute, and digital services without receiving unrestricted control of a wallet. The product combines a human-controlled smart account with constrained agent permissions, visible attribution, and a unified experience across Arbitrum and Robinhood Chain.

## Core capabilities

- Shared human-agent payment identity.
- Limited and revocable agent spending authority.
- Gas-sponsored ERC-4337 payments.
- Arbitrum Sepolia and Robinhood Chain testnet support.
- Unified multi-chain balances and activity.

## Demo promise

The agent completes a small approved payment, a larger unauthorized payment is blocked, and the activity feed explains both outcomes. The owner can revoke the agent mandate from the control room. The product demonstrates real sponsored testnet payments on both supported chains; live revocation remains an explicitly documented verification gap.

## Verified onchain evidence

- Shared Modular Account V2: [`0xA4d8…F2FE`](https://sepolia.arbiscan.io/address/0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE)
- Production Arbitrum Sepolia payment: [`0x9529…8d2b`](https://sepolia.arbiscan.io/tx/0x952916eb8280a0a30972edfa181f337fc0d3bbbe4d6fb390289935dc27558d2b)
- Robinhood Chain Testnet payment: [`0x0632…42f3`](https://explorer.testnet.chain.robinhood.com/tx/0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3)
- [Claims and evidence matrix](CLAIMS.md)

## Documentation

- [Documentation index](docs/README.md)
- [Web documentation](frontend/docs.html)
- [Product requirements](docs/PRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Agent service API](docs/API.md)
- [Security model](docs/SECURITY.md)
- [Product design](docs/DESIGN.md)
- [Locked scope](docs/SCOPE.md)
- [Frontend direction](docs/FRONTEND-DIRECTION.md)
- [Build tasks](docs/TASKS.md)
- [Testing and onchain evidence](docs/TESTING-STATUS.md)
- [Claims and evidence matrix](CLAIMS.md)
- [HackQuest submission draft](SUBMISSION.md)
- [LLM-readable product map](public/llms.txt)
- [Project memory](memory.md)

## Product routes

- `/` — product story, mechanism, supported networks, and entry point.
- `/proof.html` — public production status, active mandates, confirmed chain receipts, and judge review path.
- `/docs.html` — technical model, policy reference, agent API, evidence, and setup.
- `/agent.html` — live service detection, owner-authenticated policy inspection, and copy-ready agent adapters.
- `/onboarding.html` — owner connection, smart-account preparation, mandate configuration, and review.
- `/app.html` — live control room for policy, balances, payments, activity, and revocation.
- `/llms.txt` — concise machine-readable project context and canonical links.

## Current status

The landing page, technical documentation, wallet-aware onboarding, control room, dual-chain Modular Account V2 deployment, delegated mandate, authenticated agent service, sponsored payments on Robinhood Chain Testnet and Arbitrum Sepolia, and policy rejection path are implemented. The public repository passes all 17 tests and a clean production build. Live revocation evidence and the demo video remain; routing and bridging are outside the verified scope.

## Local development

Copy `.env.example` to `.env.local`, add the Alchemy application key and Gas Manager policy ID, then run `npm install`, `npm run dev`, and `npm run agent:serve`. Browser code never receives those credentials. The agent service creates an ignored `.agent-api-token.local` for trusted AI runtimes; browser demo sessions instead require a short-lived owner signature.

For a built Node deployment, run `npm run build`, `npm run agent:serve`, and `npm start`. The production server serves `dist` and keeps the Alchemy and agent proxies server-side; a static-only host is not sufficient for the authenticated product routes.
