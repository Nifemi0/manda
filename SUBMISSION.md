# Manda — HackQuest entry draft

**Status: prepared locally; not submitted.** This draft targets the Arbitrum Open House Singapore Online Buildathon on HackQuest. Check the live event page and entry form for the final fields, track rules, and timezone before submitting.

## Project title

Manda: Human-owned payments for personal AI agents

## One-line description

Manda gives personal AI agents narrow, revocable payment authority from a human-owned smart account without exposing the owner's wallet key.

## Recommended category

If the entry form asks for a category, review **Promising Products Track** first: Manda is a working testnet product with a focused user problem and verified execution, but it does not claim user traction or mainnet readiness. Do not claim automatic entry into multiple prize categories; follow the live form. The deployed project is on Arbitrum Sepolia, which meets the published Arbitrum-chain deployment requirement, and also has a separate Robinhood Chain Testnet path. The code now includes optional USDG testnet policy and payment support on both networks; live USDG execution and production deployment still need verification. The event lists USDG as extra consideration, not as a qualification requirement.

## Project description

AI agents increasingly need to pay for APIs, data, compute, and digital services, but handing an agent unrestricted wallet access creates an unacceptable security boundary. Manda turns permission into the product.

A person creates and owns one ERC-4337 Modular Account V2 identity. The agent receives a separate delegated key and can request user-funded payments only within an owner-defined mandate: approved chain, recipient, per-payment ceiling, UTC-resetting daily budget, non-resetting total cap, expiry, replay protection, approval threshold, and optional minimum balance reserve. Eligible transaction gas is sponsored, and every approval or rejection is attributed in the activity ledger.

Manda is deployed across Arbitrum Sepolia and Robinhood Chain Testnet using the same deterministic smart-account address. Both networks have confirmed sponsored agent payments. The live production path connects a Vercel frontend to an authenticated service on a VPS, so the project is a working end-to-end system rather than a simulated interface.

## Why it matters

Existing wallets are designed around a human approving each action or giving software broad key access. Manda provides a safer middle layer for autonomous commerce: the human remains the root owner while the agent receives enough authority to complete routine purchases and no more.

## How the AI agent uses Manda

Manda does not ship or claim its own AI model. It exposes a narrow payment tool that an existing AI runtime can call with a recipient, amount, request identifier, and supported network. The agent uses a separate delegated key; deterministic service checks and the account's installed validation modules decide whether the request is permitted. Larger requests require owner approval. The owner’s signing key and the delegated private key stay outside the browser.

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

## Architecture and contract note

The Vercel site serves the frontend and forwards restricted agent API routes to the authenticated service on the VPS. That service loads the delegated signer and policy data server-side. Owner setup submits Modular Account V2 operations through ERC-4337; Candide sponsors the Arbitrum path and Alchemy sponsors the Robinhood testnet path. Each network executes independently; bridging is not part of the verified product.

The repository composes the deployed Modular Account V2 and installed validation modules through the account SDK; it does not contain a bespoke Solidity contract. Describe the onchain enforcement as installed account modules and show their configuration and explorer evidence. Do not imply an independent contract audit.

## Links

- Live product: https://manda-dun.vercel.app/
- Agent integration: https://manda-dun.vercel.app/agent.html
- Documentation: https://manda-dun.vercel.app/docs.html
- Source: https://github.com/Nifemi0/manda
- Arbitrum account: https://sepolia.arbiscan.io/address/0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE
- Arbitrum production payment: https://sepolia.arbiscan.io/tx/0x952916eb8280a0a30972edfa181f337fc0d3bbbe4d6fb390289935dc27558d2b
- Robinhood payment: https://explorer.testnet.chain.robinhood.com/tx/0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3
- Demo video: **add public video URL before submission**

## Reproduction checks

From a clean checkout, run:

```bash
npm ci
npm test
npm run build
```

The full local wallet and payment flow also needs the server-side values in `.env.local` and the local agent service. Never include `.env.local`, agent keys, API tokens, or policy credentials in the public repository or video. Use the deployed demo for judging rather than asking reviewers to configure private service credentials.

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
- Manda has no published user or adoption metrics; do not imply traction.
- USDG policy/payment support has been implemented for Paxos testnet token addresses. Do not claim live or production USDG execution until the owner installs a USDG mandate, funds the test account from the official faucet, and verifies a transfer and rejection on the deployed backend.
- Payment principal always comes from the user's smart account. The sponsor pays eligible gas only. The owner sets separate per-payment, UTC daily, and cumulative lifetime payment caps; the daily budget resets, the onchain total cap does not. The approved USDG recipient is checked by Manda's authenticated service; the standard SDK hook does not constrain the ERC-20 transfer destination in calldata.
- The repository does not include custom Solidity source; the onchain account and validation modules come from the Modular Account SDK.

## Screenshots and demo video

Do not reuse the existing full-page images under `evidence/` as final entry media: they capture an earlier design and test state. Capture fresh images from the current production site after the final UI review:

- Landing page showing the human-owned identity and agent boundary.
- Public proof page with both networks and confirmed explorer links.
- Connected control room showing the active policy and attributed payment.
- Agent connection page showing the narrow request interface.

Record a 90–120 second walkthrough using the sequence below. Add the public video URL and the project cover image after they are created.

## Final portal checklist

- Confirm the live form's exact title, category, description, team, and link fields; fill team roles and contact details without guessing.
- Add a current cover image and fresh screenshots; do not upload the older `evidence/` screenshots as if they showed the current build.
- Record and publish the walkthrough, then add its public video URL.
- Re-check the deadline timezone and any extra terms in HackQuest before the final submit action.
- Verify the public repository and live demo open in a signed-out browser.
