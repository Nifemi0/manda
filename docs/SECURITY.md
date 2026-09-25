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

The installed Modular Account V2 modules bind the delegated validation entity and the owner's cumulative total payment allowance in ETH or USDG. That total cap is lifetime for the mandate and does not reset. The service separately enforces the per-payment maximum, UTC daily budget and pending reservations. Before submission it also reads the remaining onchain allowance, so a direct transfer made with the delegated key cannot silently desynchronize the service's ledger. Every payment principal comes from the user's smart account; the configured paymaster sponsors network gas only.

For USDG, the standard SDK hook limits spend against the configured testnet token but does not inspect the recipient inside ERC-20 transfer calldata. Recipient approval is enforced by the authenticated Manda service, so a compromised delegated key could bypass that check and send tokens to another address up to the remaining onchain token cap. This path is testnet-only and not production-ready.

The interface labels these layers separately. A runtime daily budget resets at UTC midnight; the cumulative onchain total cap never resets. The onboarding form requires the total cap to be at least the daily budget.

## Implemented controls

- Local secrets and mutable security state are excluded from Git.
- Browser bundles contain neither the Alchemy application key nor Gas Manager policy ID.
- Payment, policy, and activity routes require an agent token or verified owner session.
- Owner policy signatures fail after any signed field is changed.
- High-value approval signatures bind the policy, request ID, account, chain, asset, recipient, amount, and expiry.
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
