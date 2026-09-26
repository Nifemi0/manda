# Manda Agent Service API

The agent service exposes a narrow payment interface locally at `http://127.0.0.1:4174` and remotely at `https://manda-dun.vercel.app/api/agent`. The production Vercel route forwards permitted requests to the private service on the VPS, so the frontend never receives the delegated private key or server credentials.

The HTTPS API is live for one configured owner and agent service. Multi-tenant isolation, public self-service token provisioning, and independent agent-token rotation remain future work.

The interactive connection guide at `/agent.html` checks service availability, creates an owner-authenticated browser session, reads the selected mandate, and generates adapters for common agent runtimes. It never renders the bearer token or delegated private key.

## Authentication

Private routes accept one of two authenticated callers:

- A trusted agent runtime sends `Authorization: Bearer <token>`. The token is generated in `.agent-api-token.local` when `AGENT_SERVICE_TOKEN` is not provided.
- A browser session sends the short-lived owner session returned after wallet signature verification.

Local tokens, sessions, owner pins, private keys, policies, and ledgers are ignored by Git.

## Health and identity

### `GET /status`

Returns public service health and the delegated agent address. It does not expose the private key or bearer token.

### `GET /capabilities?chainId=<id>&asset=<ETH|USDG>`

Available through the local service and production Vercel proxy. Requires the same bearer token or verified owner session as `/policy`. Returns policy status, permitted recipients, payment/daily/total limits, approval threshold, daily spend remaining, and supported actions. `quote` is currently `false`; quote-to-invoice purchasing is not implemented.

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
  "asset": "ETH",
  "recipient": "0x...",
  "amountWei": "100000000000"
}
```

`requestId` must be unique. `asset` must match the active mandate (`ETH` or `USDG`); older ETH clients that omit it remain compatible. `amountWei` is a positive base-10 integer string in the asset's smallest units: wei for ETH and 6-decimal base units for USDG. The payment amount is transferred from the user's smart account. The paymaster sponsors eligible network gas only. `recipient` must be one of the active mandate's signed `recipients` (legacy policies with one `recipient` remain readable) and `chainId` must identify a supported network. USDG is accepted only at the official Paxos testnet token address for the selected test chain.

An allowed request returns the policy decision plus the UserOperation and transaction evidence. A blocked request returns stable `code` and `reason` fields, a human-readable `message`, and a `retryable` flag without submitting value transfer.

The owner's per-payment cap and UTC daily budget are evaluated by the service. A separate owner-set lifetime total cap is enforced by the onchain native-ETH or USDG token hook; it never resets. The service reads its remaining allowance before submission and returns `TOTAL_ALLOWANCE_EXCEEDED` when it cannot cover the request. For ETH, the installed allowlist module includes the recipient set. For USDG, recipients are enforced by the authenticated Manda service; the standard SDK hook does not bind the ERC-20 transfer's recipient argument onchain. Keep the delegated signer private and treat this path as a testnet prototype.

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
- `TOTAL_ALLOWANCE_EXCEEDED` — the lifetime onchain cap has been spent or cannot cover this request.
- `BALANCE_FLOOR_BREACH` — settlement would leave less than the owner-defined reserve.
- `OWNER_APPROVAL_REQUIRED` — the request exceeds the auto-approval threshold and needs a bound owner signature.
- `REQUEST_ALREADY_USED` — the request ID cannot be replayed.
- `WRONG_CHAIN` — the request does not match the policy network.
- `ASSET_NOT_ALLOWED` — the request asset does not match the active mandate.
- `TOKEN_BALANCE_TOO_LOW` — the smart account does not hold enough of the policy token.

The implementation may return a more specific transport or bundler error after policy authorization if a network provider rejects the UserOperation.
