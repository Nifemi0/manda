# Manda claims and evidence

Updated: 2026-09-26

This file separates demonstrated behavior from implemented but unverified behavior and future work.

## Demonstrated

| Claim | Evidence |
| --- | --- |
| Manda uses a human-owned Modular Account V2 on Arbitrum Sepolia. | [Smart account on Arbiscan](https://sepolia.arbiscan.io/address/0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE) and [deployment notes](evidence/ARBITRUM-DEPLOYMENT.md). |
| The production Vercel-to-VPS path can execute an authenticated, sponsored Arbitrum Sepolia payment. | [New confirmed transaction `0x166b…ea3`](https://sepolia.arbiscan.io/tx/0x166bb92cb97c3b15947289a88bcd04f37fce41b82db03c8f6de7c7e92ace9ea3), receipt status `0x1`, block `312715270`; see [saved API and RPC results](submission/evidence). |
| The same deterministic account address is deployed on Robinhood Chain Testnet and can execute sponsored payments. | [Confirmed transaction `0x0632…42f3`](https://explorer.testnet.chain.robinhood.com/tx/0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3), block `122007013`. |
| Requests above the configured payment limit are blocked before a transaction is created. | On 2026-09-25, the production API returned HTTP `403` and `PAYMENT_LIMIT_EXCEEDED` for an amount one wei above the cap, without a transaction hash. See [saved response](submission/evidence/live-block-result.json). |
| The agent cannot authorize itself by sending a boolean approval flag. | Automated tamper-resistance and signed-approval tests in `tests/policy-auth.test.mjs` and `tests/policy-engine.test.mjs`. |
| The owner can revoke an Arbitrum mandate onchain. | On 2026-09-26, the owner signed [revocation transaction `0x60f2…b177`](https://sepolia.arbiscan.io/tx/0x60f202ec751b31e012e7f4e566e0d2960f3f6314bae9bce5e9e258ba38beb177). The former entity `1` reported disabled validation flags, and the agent service reported the policy revoked. A new owner-signed entity `2` was then installed and reported active. |
| ETH mandates are active on both supported testnets. | On 2026-09-26, read-only onchain checks found Arbitrum entity `2` and Robinhood entity `3` active, each with a `5000000000000 wei` cumulative cap expiring 2026-10-26 19:00 UTC. The [public status page](https://manda-dun.vercel.app/proof.html) reported both active. This confirms mandate state, not a fresh payment under either renewed mandate. |
| The repository is reproducible from tracked files. | On 2026-09-26, `npm test` passed 31/31 tests and `npm run build` succeeded. |

## Implemented, awaiting live verification

- Owner-signed uninstall on Robinhood Chain Testnet.
- Rejection of an agent request after a live onchain mandate has been revoked.

The policy engine's revoked-state rejection is covered by automated tests. The Arbitrum live uninstall was captured; Robinhood live uninstall and a subsequent denied payment remain to be demonstrated.

## Outside the verified scope

- Automatic chain selection, bridging, swaps, or rebalancing.
- Mainnet funds, production custody, or production security guarantees.
- Live USDG execution or production USDG support before end-to-end testnet verification and deployment.

Manda is a testnet hackathon prototype. The two payment paths operate independently and do not depend on a bridge.
