# Manda claims and evidence

Updated: 2026-09-23

This file separates demonstrated behavior from implemented but unverified behavior and future work.

## Demonstrated

| Claim | Evidence |
| --- | --- |
| Manda uses a human-owned Modular Account V2 on Arbitrum Sepolia. | [Smart account on Arbiscan](https://sepolia.arbiscan.io/address/0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE) and [deployment notes](evidence/ARBITRUM-DEPLOYMENT.md). |
| The production Vercel-to-VPS path can execute an authenticated, sponsored Arbitrum Sepolia payment. | [Confirmed transaction `0x9529…8d2b`](https://sepolia.arbiscan.io/tx/0x952916eb8280a0a30972edfa181f337fc0d3bbbe4d6fb390289935dc27558d2b), receipt status `0x1`, block `310901837`. |
| The same deterministic account address is deployed on Robinhood Chain Testnet and can execute sponsored payments. | [Confirmed transaction `0x0632…42f3`](https://explorer.testnet.chain.robinhood.com/tx/0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3), block `122007013`. |
| Requests above the configured payment limit are blocked before a transaction is created. | Live service returned `PAYMENT_LIMIT_EXCEEDED`; the rejection is recorded in the activity ledger. See [testing status](docs/TESTING-STATUS.md). |
| The agent cannot authorize itself by sending a boolean approval flag. | Automated tamper-resistance and signed-approval tests in `tests/policy-auth.test.mjs` and `tests/policy-engine.test.mjs`. |
| The repository is reproducible from tracked files. | On 2026-09-20, an isolated `npm ci`, `npm test`, and `npm run build` passed with 17/17 tests. |

## Implemented, awaiting live verification

- Owner-signed uninstall of the validation entity and hooks on both supported chains.
- Rejection of an agent request after the live onchain mandate has been revoked.

The policy engine's revoked-state rejection is covered by automated tests. The live uninstall flow is intentionally left active for the demo account until it is captured as the final revocation demonstration.

## Outside the verified scope

- Automatic chain selection, bridging, swaps, or rebalancing.
- Mainnet funds, production custody, or production security guarantees.
- Live USDG execution or production USDG support before end-to-end testnet verification and deployment.

Manda is a testnet hackathon prototype. The two payment paths operate independently and do not depend on a bridge.
