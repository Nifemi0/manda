# Manda submission media and proof

The current project cover is [`media/cover.png`](media/cover.png). The other production screenshots are [`media/proof-status.png`](media/proof-status.png), [`media/proof-receipts.png`](media/proof-receipts.png), and [`media/agent-tool.png`](media/agent-tool.png). Two frames from the final video are [`media/live-payment.png`](media/live-payment.png) and [`media/policy-denial.png`](media/policy-denial.png).

The video was recorded as a 97-second 1920×1080 proof cut with a neural voiceover. It shows the real production agent API approving a testnet payment and blocking an amount above the configured cap. The public video URL is recorded in [`../SUBMISSION.md`](../SUBMISSION.md) after publication.

[`evidence/live-pay-result.json`](evidence/live-pay-result.json) is a sanitized summary of the authenticated API's approved response. [`evidence/live-onchain-receipt.json`](evidence/live-onchain-receipt.json) is the public Arbitrum Sepolia RPC receipt confirming transaction `0x166bb92cb97c3b15947289a88bcd04f37fce41b82db03c8f6de7c7e92ace9ea3` in block `312715270` with status `0x1`. [`evidence/live-block-result.json`](evidence/live-block-result.json) records the separate HTTP 403 `PAYMENT_LIMIT_EXCEEDED` response with no transaction hash. The JSON files contain no bearer token or private key.

This is testnet evidence. The Robinhood screenshot shows a historically confirmed payment and an expired mandate; it does not establish a currently active Robinhood mandate. Owner-signed live revocation and USDG payment execution are not yet demonstrated.
