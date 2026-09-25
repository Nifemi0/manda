# Manda Testing Status

Updated: 2026-09-20

## Verified

- Production frontend build succeeds with Vite.
- Seventeen automated tests cover policy boundaries, scoped and reserved daily spend, invalid amounts, revocation state, replay, signed approval retries, wrong-chain requests, untrusted approval flags, and tamper-resistant owner signatures.
- The human-owned Modular Account V2 has non-empty runtime bytecode on Arbitrum Sepolia.
- The local agent service loads a separate secp256k1 key from an ignored local file and reports a distinct service recipient.
- The browser never receives the agent private key.
- A real Arbitrum Sepolia mandate is installed and persisted for entity `1`.
- The mandate transaction is `0x89c7ceb6a53067fd7fd3b344b030a26886fc35615648a7deda9f8642c52fdd1b` and the UserOperation is `0x9f7bf98d58e3c5fc654d1cf41c2f3f9786d65259c06a0e1ded23a81b75021347`.
- The live control room shows the active policy, the Candide sponsorship state, and the Arbitrum smart-account address `0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE`.
- An excessive agent request was rejected by the live service with `PAYMENT_LIMIT_EXCEEDED` and recorded in the local activity ledger.
- Robinhood Chain Testnet is enabled in the fresh Alchemy app and the active BSO policy is wired through the `x-alchemy-policy-id` bundler header.
- The same deterministic smart-account address is deployed on Robinhood Chain Testnet. Transaction: `0xf4b35bd728eeca4012a07846a2da5c6ff63b79af24bbee1d02de66b61dce51f2`; UserOperation: `0xf3f6f691e10aced273f1479fb582bea867a96c0c97147990e67c0bb5499df8dd`; receipt status `0x1`, block `0x74527fa`.
- A Robinhood Chain Testnet mandate is now installed for entity `1`. Transaction: `0x589fae289844fa29b3f3238c2041b9879b224bbc123e9462f3152b90bbccef15`; UserOperation: `0x2121ec1d84072addfea70b44328e7735cb4a9422a6220b02a813fae46d95c178`; receipt status `0x1`, block `0x7454826`.
- The agent service now routes approved requests by chain, persists separate Arbitrum and Robinhood policies, and uses Alchemy BSO sponsorship with estimated execution gas on Robinhood.
- Runtime policy adds a signed approval threshold and optional user balance reserve on top of the cumulative onchain total cap. The payment amount is user-funded; the sponsor pays gas only. Caller-supplied approval booleans are rejected.
- A real approved Robinhood payment is confirmed: `400000000000` wei (`0.0000004 ETH`) to the allowlisted recipient. Transaction: `0xeb7b21085cf119113d44a13e1b06147553ede705c7e3b2e2fafda0b3f66b437e`; UserOperation: `0x9f5fd89ede2121615c1285f83b7032912d779333dea271944160e6bc40c45146`; receipt status `0x1`, block `0x74583d1`.
- After settlement, the smart account balance is `0.0259996 ETH` and the recipient balance is `0.0000004 ETH`; the payment remained above the `0.001 ETH` reserve.
- A Robinhood request for `0.00008 ETH` was rejected with `PAYMENT_LIMIT_EXCEEDED` and recorded without creating a transaction.
- Unauthenticated `/pay` and `/activity` requests now return `401`; invalid, zero, and negative amounts return `INVALID_REQUEST` without a transaction.
- Alchemy API and Gas Manager values are absent from the production browser bundle.
- During the security audit, the stale pre-fix service accepted a `1 wei` Robinhood testnet probe before it was restarted. The confirmed transaction is `0x8e86c0269835b8c65d6859a7cf4893587ca2e285d6b2b92d86a9f1c0a41bf806`; it remains in the ledger as evidence.
- The hardened authenticated agent path was retested on both networks. Robinhood confirmed a `1 wei` payment in transaction `0x063219ecd3b3c8913ca40f3eba470dd16fa66d552c9ea95e4a62f645035142f3` at block `122007013`. The matching Arbitrum request was correctly blocked with `BALANCE_FLOOR_BREACH` because the account balance is `0 ETH`; no Arbitrum transaction was created.
- After funding, the hardened Arbitrum path confirmed an authenticated `1 wei` agent payment through Candide. Transaction: `0xde404f32df06016fe3f2c97afb028cf853246c479258547270fadf4443b2c1d8`; UserOperation: `0xfaeec686e9f9cd82b58927a6be21d8326e1ac36499b71fdeff40178e82f5e503`; receipt status `success`, block `310850473`. The account retained `0.025999999999999999 ETH`, the recipient received `1 wei`, and the onchain allowance decreased to `4999999999999 wei`.
- The deployed Vercel-to-VPS production path was exercised in Chrome with the owner session verified. A `100000000000 wei` (`0.0000001 ETH`) Arbitrum Sepolia payment reached the allowlisted recipient through Candide sponsorship. Transaction: `0x952916eb8280a0a30972edfa181f337fc0d3bbbe4d6fb390289935dc27558d2b`; UserOperation: `0xcef93aadfc42a575013f8daa043e842d57d60322a83524a5ce6ee04671d8c248`; receipt status `0x1`, block `310901837`. The production control room displayed the confirmed result and explorer evidence in its attributed activity ledger.
- A clean tracked-files verification completed on 2026-09-20: `npm ci`, all 17 automated tests, and the Vite production build passed from an isolated directory.

Run the automated checks with:

```bash
npm test
npm run build
```

## Implemented but awaiting onchain verification

- Owner-signed uninstall of the validation entity and all three hooks on both chains. The Robinhood-specific path is implemented but has not been executed against the live mandate.
- A rejected post-revocation operation.
- USDG payment code now targets Paxos's official Arbitrum Sepolia and Robinhood Testnet token contracts, with asset-bound owner policy signatures, ERC-20 spend hooks, token-balance checks, and asset-scoped service budgets. The owner-set onchain total cap is cumulative and separate from the UTC daily budget. No USDG mandate or transfer has been installed or confirmed onchain yet.
- The SDK's ERC-20 hook caps token spend but does not bind the transfer destination. Manda checks the approved recipient in the authenticated payment service; direct onchain recipient binding would require an additional contract/module.
- On 2026-09-23, the USDG token contract code, symbol, and 6-decimal metadata were verified read-only against Arbitrum Sepolia and Robinhood Testnet. `npm test` passes 26/26 and `npm run build` succeeds. No USDG UserOperation was submitted as part of these checks.

Both payment paths and mandate installations are verified. Revocation remains unverified until the owner signs the live uninstall flow; executing it will intentionally disable the active demo mandate.

## Submission work remaining

- Record and publish the demo video.
- Add the final team/profile fields and demo URL in HackQuest.
