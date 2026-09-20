# Manda Security Model

Manda is a testnet hackathon prototype. Its security goal is to prove that a personal AI agent can make useful payments without receiving the human owner's wallet credentials or unlimited account authority.

## Protected assets

- Human owner private key and wallet authority.
- Delegated agent private key.
- Agent service bearer token and owner sessions.
- Smart-account balance and remaining onchain allowance.
- Runtime daily budget, pending reservations, and activity ledger.
- Alchemy application key and Gas Manager policy ID.

## Trust boundaries

- **Owner wallet:** the root authority for account deployment, mandate installation, high-value approval, and revocation.
- **Browser:** an untrusted presentation surface that receives public account state and short-lived owner sessions, but no service or agent private keys.
- **Agent service:** a trusted local signer and policy executor for one pinned owner.
- **Bundler and paymaster:** external execution infrastructure that can reject or delay operations but cannot expand the installed agent authority.
- **Smart account:** the final onchain execution boundary and holder of validation modules and hooks.

## Enforcement layers

The installed Modular Account V2 modules bind the delegated validation entity and cumulative native-token spend allowance. The service enforces detailed runtime conditions: active status, expiry, supported chain, approved recipient, positive amount, per-payment maximum, daily budget, pending reservations, reserve floor, signed approval threshold, and replay protection.

The interface labels these layers separately. A runtime daily limit is not described as a daily-resetting onchain allowance.

## Implemented controls

- Local secrets and mutable security state are excluded from Git.
- Browser bundles contain neither the Alchemy application key nor Gas Manager policy ID.
- Payment, policy, and activity routes require an agent token or verified owner session.
- Owner policy signatures fail after any signed field is changed.
- High-value approval signatures bind the policy, request ID, account, chain, recipient, amount, and expiry.
- Payment execution is serialized and reserves daily capacity before network submission.
- Ledger updates use atomic file replacement.
- Activity rendering escapes untrusted values before inserting them into HTML.
- Revocation selects the policy chain and uninstalls the validation entity and associated hooks.

## Prototype limits

- The local service is pinned to one owner. A hosted multi-tenant service requires isolated signer, policy, session, and ledger namespaces backed by production persistence.
- Local JSON files are durable enough for the demo but are not a production transactional database.
- Live revocation has not been executed because it would disable the active demonstration mandates.
- No bridge, token-swap, or production recovery mechanism is part of the verified critical path.
- The supported chains and balances are testnet-only.

## Reporting a problem

Do not place private keys, service tokens, environment values, or wallet recovery phrases in a public issue. Report reproducible non-sensitive problems through the [GitHub issue tracker](https://github.com/Nifemi0/manda/issues). For a sensitive report, contact the repository owner through their GitHub profile before sharing details.
