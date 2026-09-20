# Manda — HackQuest submission draft

## One-line description

Manda gives personal AI agents narrow, revocable payment authority from a human-owned smart account without exposing the owner's wallet key.

## Project description

AI agents increasingly need to pay for APIs, data, compute, and digital services, but handing an agent unrestricted wallet access creates an unacceptable security boundary. Manda turns permission into the product.

A person creates and owns one ERC-4337 Modular Account V2 identity. The agent receives a separate delegated key and can request payments only within an owner-defined mandate: approved chain, recipient, per-payment ceiling, daily allowance, expiry, replay protection, approval threshold, and minimum balance reserve. Eligible transactions are gas sponsored, and every approval or rejection is attributed in the activity ledger.

Manda is deployed across Arbitrum Sepolia and Robinhood Chain Testnet using the same deterministic smart-account address. Both networks have confirmed sponsored agent payments. The live production path connects a Vercel frontend to an authenticated service on a VPS, so the project is a working end-to-end system rather than a simulated interface.

## Why it matters

Existing wallets are designed around a human approving each action or giving software broad key access. Manda provides a safer middle layer for autonomous commerce: the human remains the root owner while the agent receives enough authority to complete routine purchases and no more.

## Core features

- Human-owned Modular Account V2 identity.
- Separate delegated agent key; the owner's key never enters the agent service.
- Runtime and onchain policy enforcement.
- Signed human approval for payments above the auto-approval threshold.
- Gas-sponsored ERC-4337 execution.
- Independent Arbitrum Sepolia and Robinhood Chain Testnet payment paths.
- Owner-authenticated control room with balances, mandates, and attributed activity.
- Copy-ready cURL, JavaScript, Python, and tool-schema integrations for AI runtimes.

## Technology

JavaScript, Vite, Node.js, viem, Alchemy Modular Account V2, ERC-4337, Candide bundler/paymaster on Arbitrum Sepolia, Alchemy Bundler and Gas Manager on Robinhood Chain Testnet, Vercel, Nginx, and systemd.

## Links

- Live product: https://manda-dun.vercel.app/
- Agent integration: https://manda-dun.vercel.app/agent.html
- Documentation: https://manda-dun.vercel.app/docs.html
- Source: https://github.com/Nifemi0/manda
- Arbitrum account: https://sepolia.arbiscan.io/address/0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE
- Arbitrum production payment: https://sepolia.arbiscan.io/tx/0x952916eb8280a0a30972edfa181f337fc0d3bbbe4d6fb390289935dc27558d2b
- Robinhood payment: https://explorer.testnet.chain.robinhood.com/tx/0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3
- Demo video: **add public video URL before submission**

## Suggested demo sequence

Target length: 90–120 seconds.

1. State the problem: an AI agent needs purchasing power without unrestricted wallet custody.
2. Show the human-owned identity and active mandate in the control room.
3. Open the agent connection page and show the narrow payment tool schema.
4. Submit a permitted payment and open its explorer evidence.
5. Submit an excessive payment and show `PAYMENT_LIMIT_EXCEEDED` with no transaction.
6. Show the same account and independent payment evidence on Robinhood Chain Testnet.
7. Close with the thesis: “Give agents permission, not your wallet.”

## Honest limitations

- The product uses testnet funds.
- Live owner-signed revocation is implemented but has not yet been captured as onchain evidence.
- Automatic routing, bridging, swaps, and rebalancing are outside the verified build.
- This prototype has not received a third-party security audit.

## Fields to complete in HackQuest

- Team member name, role, and contact details.
- Public demo video URL.
- Project image or cover asset.
