# Manda claims and evidence

Updated: 2026-09-25

This file separates demonstrated behavior from implemented but unverified behavior and future work.

## Demonstrated

| Claim | Evidence |
| --- | --- |
| Manda uses a human-owned Modular Account V2 on Arbitrum Sepolia. | [Smart account on Arbiscan](https://sepolia.arbiscan.io/address/0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE) and [deployment notes](evidence/ARBITRUM-DEPLOYMENT.md). |
| The production Vercel-to-VPS path can execute an authenticated, sponsored Arbitrum Sepolia payment. | [New confirmed transaction `0x166b…ea3`](https://sepolia.arbiscan.io/tx/0x166bb92cb97c3b15947289a88bcd04f37fce41b82db03c8f6de7c7e92ace9ea3), receipt status `0x1`, block `312715270`; see [saved API and RPC results](submission/evidence). |
| The same deterministic account address is deployed on Robinhood Chain Testnet and can execute sponsored payments. | [Confirmed transaction `0x0632…42f3`](https://explorer.testnet.chain.robinhood.com/tx/0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3), block `122007013`. |
| Requests above the configured payment limit are blocked before a transaction is created. | On 2026-09-25, the production API returned HTTP `403` and `PAYMENT_LIMIT_EXCEEDED` for an amount one wei above the cap, without a transaction hash. See [saved response](submission/evidence/live-block-result.json). |
| The agent cannot authorize itself by sending a boolean approval flag. | Automated tamper-resistance and signed-approval tests in `tests/policy-auth.test.mjs` and `tests/policy-engine.test.mjs`. |
| The repository is reproducible from tracked files. | On 2026-09-25, `npm test` passed 29/29 tests and `npm run build` succeeded. |

## Implemented, awaiting live verification

- Owner-signed uninstall of the validation entity and hooks on both supported chains.
- Rejection of an agent request after the live onchain mandate has been revoked.

The policy engine's revoked-state rejection is covered by automated tests. The live uninstall flow is intentionally left active for the demo account until it is captured as the final revocation demonstration.

## Outside the verified scope

- Automatic chain selection, bridging, swaps, or rebalancing.
- Mainnet funds, production custody, or production security guarantees.
- Live USDG execution or production USDG support before end-to-end testnet verification and deployment.

Manda is a testnet hackathon prototype. The two payment paths operate independently and do not depend on a bridge.
