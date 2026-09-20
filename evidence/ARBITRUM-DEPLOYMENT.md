# Arbitrum Sepolia smart-account deployment

Verified: 2026-09-20

## Result

- Account type: Alchemy Modular Account V2 using ERC-4337 entry point v0.7
- Network: Arbitrum Sepolia (`421614`)
- Smart account: `0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE`
- Sponsorship path: Candide public Arbitrum Sepolia bundler/paymaster fallback
- UI transaction evidence: `0x0798…e367`
- RPC verification: `eth_getCode` returned non-empty EIP-7702-style delegated account runtime bytecode.
- Production authenticated payment: [`0x952916eb8280a0a30972edfa181f337fc0d3bbbe4d6fb390289935dc27558d2b`](https://sepolia.arbiscan.io/tx/0x952916eb8280a0a30972edfa181f337fc0d3bbbe4d6fb390289935dc27558d2b), receipt status `0x1`, block `310901837`.

## Independent verification

Run:

```powershell
$body = @{ jsonrpc = '2.0'; id = 1; method = 'eth_getCode'; params = @('0xA4d8005e48893eD97cB765D7C3D4bcD7bE01F2FE', 'latest') } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri 'https://sepolia-rollup.arbitrum.io/rpc' -Method Post -ContentType 'application/json' -Body $body
```

Expected: a non-empty `result`, currently beginning `0x363d3d...`.

The full transaction hash was not retained by the pre-persistence frontend build. The current build persists both the UserOperation hash and transaction hash for every subsequent deployment. The account bytecode is authoritative evidence that the account is deployed; a full explorer link will be added when the indexer exposes the account creation operation.
