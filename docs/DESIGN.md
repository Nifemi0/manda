# Product Design

## Design goal

Make delegated agent spending understandable at a glance. The user should always know who acted, what rule allowed or blocked the action, which chain was used, and how much authority remains.

Every public-facing page must contain enough specific product explanation to stand on its own. Avoid sparse compositions that depend on oversized type or empty space to feel complete. The navigation should share the hero's visual environment rather than appearing as a separate bar layered above it.

## Core screens

### Identity dashboard

- Payment identity handle and smart-account identity.
- Combined balance with a per-chain breakdown.
- Human owner status and active agent status.
- Primary actions: fund, pay, manage agent, and revoke.

### Agent permissions

- Maximum amount per payment.
- Daily allowance and amount remaining.
- Approved services or recipient addresses.
- Allowed token and chains.
- Expiration date.
- Clear save and revoke controls.

### Payment confirmation

- Initiator: human or named agent.
- Recipient or service.
- Amount and token.
- Selected chain.
- Gas shown as sponsored when applicable.
- Permission rule used for approval.

### Activity feed

Each item shows:

- Human or agent initiator.
- Successful, blocked, pending, bridging, or failed status.
- Amount, token, recipient, network, timestamp, and transaction link.
- A plain-language reason for blocked actions.

### Cross-chain balance

- Balance on Arbitrum Sepolia.
- Balance on Robinhood Chain testnet.
- Suggested destination chain for a payment.
- Optional rebalance action with expected time and fees.

## Demo states

- Agent payment approved because it is within the allowance.
- Agent payment blocked because it exceeds the per-payment or daily limit.
- Agent access revoked by the human.
- Subsequent agent request rejected because its delegation is inactive.
- Network selected automatically.
- Optional bridge shown as a secondary enhancement.

## Content principles

- Say “sponsored gas” rather than implying network execution is free.
- Explain blocked transactions in direct language, such as “Blocked: this payment exceeds the agent's $5 daily limit.”
- Keep chain details available without making the user choose a network for every action.
- Make revocation visible and immediate.
- Never display a combined balance without allowing the user to inspect its chain composition.

## Visual direction

The selected direction is **Authority Console**: a precise payment-operations dashboard centered on the agent's authority, remaining allowance, and attributed transaction evidence. The complete visual system, layout, tokens, responsive behavior, and first implementation slice are defined in [FRONTEND-DIRECTION.md](FRONTEND-DIRECTION.md).

## Accessibility

- Do not use color alone to distinguish human, agent, or transaction state.
- Keep transaction status text explicit.
- Ensure keyboard access to payment and revocation controls.
- Provide readable address truncation with full values available on demand.
