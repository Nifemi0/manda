# Manda Agent Service API

The agent service exposes a narrow payment interface at `http://127.0.0.1:4174`. In the browser application, requests are proxied through `/api/agent` so the frontend never receives the delegated private key or server credentials.

## Authentication

Private routes accept one of two authenticated callers:

- A trusted agent runtime sends `Authorization: Bearer <token>`. The token is generated in `.agent-api-token.local` when `AGENT_SERVICE_TOKEN` is not provided.
- A browser session sends the short-lived owner session returned after wallet signature verification.

Local tokens, sessions, owner pins, private keys, policies, and ledgers are ignored by Git.

## Health and identity

### `GET /status`

Returns public service health and the delegated agent address. It does not expose the private key or bearer token.

## Owner session

### `POST /auth/challenge`

Creates a nonce-bound, expiring message for an owner address.

```json
{
  "ownerAddress": "0x..."
}
```

### `POST /auth/verify`

Verifies the owner signature over the exact challenge message and creates a short-lived authenticated session.

```json
{
  "challengeId": "...",
  "signature": "0x..."
}
```

## Policy

### `GET /policy?chainId=<id>`

Returns the registered policy for Arbitrum Sepolia (`421614`) or Robinhood Chain Testnet (`46630`). Authentication is required.

### `POST /policy`

Registers the owner-signed policy and its verified onchain installation evidence. The service rejects unsigned or tampered policy content.

## Payment

### `POST /pay`

```json
{
  "requestId": "agent-run-unique-id",
  "chainId": 421614,
  "recipient": "0x...",
  "amountWei": "100000000000"
}
```

`requestId` must be unique. `amountWei` must be a positive base-10 integer string. `recipient` must match the active mandate and `chainId` must identify a supported network.

An allowed request returns the policy decision plus the UserOperation and transaction evidence. A blocked request returns a stable reason without submitting value transfer.

## Activity

### `GET /activity?chainId=<id>`

Returns the scoped ledger for the authenticated owner, account, chain, and policy. Each row records the actor, intent, decision, network, timestamp, and transaction hash when settlement occurred.

## Rejection reasons

- `INVALID_REQUEST` — missing, malformed, zero, or negative values.
- `UNAUTHORIZED` — missing or invalid caller authentication.
- `POLICY_NOT_FOUND` — no registered policy exists for the requested chain.
- `POLICY_REVOKED` — the delegate has been disabled.
- `POLICY_EXPIRED` — the mandate expiry has passed.
- `RECIPIENT_NOT_APPROVED` — the destination differs from the allowlisted address.
- `PAYMENT_LIMIT_EXCEEDED` — the request exceeds the per-payment cap.
- `DAILY_LIMIT_EXCEEDED` — confirmed and reserved spend would exceed the daily runtime budget.
- `BALANCE_FLOOR_BREACH` — settlement would leave less than the owner-defined reserve.
- `OWNER_APPROVAL_REQUIRED` — the request exceeds the auto-approval threshold and needs a bound owner signature.
- `REQUEST_ALREADY_USED` — the request ID cannot be replayed.
- `WRONG_CHAIN` — the request does not match the policy network.

The implementation may return a more specific transport or bundler error after policy authorization if a network provider rejects the UserOperation.
