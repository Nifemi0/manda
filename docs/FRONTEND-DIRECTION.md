# Locked Frontend Direction

Status: **Direction locked for the first prototype**  
Direction name: **Authority Console**

## Product perception

The product should feel like a serious control surface for delegated money: precise, calm, legible, and visibly safe. It should resemble a payment operations console more than a crypto wallet or consumer marketplace.

## Directions considered

### Authority Console — selected

A dense but readable operations dashboard built around identity, authority, limits, and an immutable-looking activity ledger.

- Best at explaining the product during a short demo.
- Makes human and agent authority visible without relying on illustration.
- Supports clear success, blocked, revoked, and pending states.
- Straightforward to build with standard React components.

### Ambient Agent

A conversational interface where the agent narrates purchases and requests authority in a chat timeline.

- Emotionally engaging and easy to understand.
- Risks making the payment controls feel secondary.
- Harder to prove chain, policy, and attribution details quickly.

### Network Map

A spatial interface centered on one identity connected to two chains, services, and a bridge.

- Visually distinctive and strong for cross-chain storytelling.
- Adds motion and diagram work before the payment loop is stable.
- Overemphasizes bridging, which is intentionally optional.

## Why Authority Console wins

Our differentiator is controlled delegation. The interface must make the agent's authority and its boundaries the first thing a judge notices. The selected direction turns the policy into a visible financial instrument and makes the blocked transaction as important as the successful one.

The direction borrows principles rather than compositions from established payment and wallet products:

- [Stripe stablecoin payments](https://stripe.com/gb/payment-method/stablecoins-and-crypto): progressive disclosure and familiar payment status language.
- [Alchemy Account Kit](https://www.alchemy.com/docs/wallets/concepts/intro-to-account-kit): smart-account and sponsored-transaction concepts.
- [Safe](https://safe.global/): owner, account, and transaction-control mental models.
- [Privy](https://www.privy.io/): embedded-wallet onboarding that does not dominate the product experience.

## Signature composition

### App shell

- Narrow left rail: product mark placeholder, Dashboard, Activity, and Settings.
- Top bar: shared identity handle, shortened smart-account address, network status, and owner menu.
- Main stage: a two-column desktop grid that collapses to one column on mobile.

### Main stage

- Left column: combined balance, per-network balances, and recent attributed activity.
- Right column: the **Authority Card**, showing the active agent, allowance meter, per-payment cap, permitted service, expiry, and revoke control.
- Demo controls sit directly below the Authority Card: **Run approved payment** and **Test policy block**.

### Activity ledger

The ledger is the visual anchor. Every row shows:

- initiator badge: Owner or Agent;
- action and recipient;
- amount and token;
- Arbitrum or Robinhood network badge;
- Sponsored gas indicator;
- success, blocked, revoked, pending, or failed status;
- expandable policy explanation and explorer link.

## Visual system

### Color

```text
Canvas           #063F3D  deep teal
Primary surface  #FFE3B3  warm paper
Raised surface   #F7C982  amber paper
Ink              #141816
Muted ink        #626963
Border           rgba(17, 20, 18, .18)
Owner accent     #063F3D  deep teal
Agent accent     #B20D35  crimson
Success          #16835B
Blocked          #C53B32
Pending          #A66B12
Focus ring       #315CFF
```

The palette follows the approved Daybreak/Brave reference path: teal environment, warm paper information surfaces, and a dominant crimson authority panel. Use accents on identity markers, controls, and status evidence. Network identity should use a labeled badge and icon, not color alone.

### Typography

- Primary: Geist Sans or Inter.
- Technical values: Geist Mono or IBM Plex Mono.
- Page title: 32/38, semibold.
- Section title: 18/24, semibold.
- Body: 14/21.
- Labels and metadata: 12/16.
- Financial values use tabular numerals.

### Geometry

- 12px card radius.
- 8px control radius.
- 1px solid borders with minimal shadow.
- 8px spacing base; major gaps use 24px or 32px.
- Maximum content width: 1440px.
- Pills are reserved for identity, network, and status.

### Motion

- 140–180ms transitions for panels, focus, and status changes.
- Approved payment: one restrained progress transition ending in evidence.
- Blocked payment: immediate policy row highlight and reason reveal; no shaking UI.
- Respect reduced-motion settings and keep every state understandable without animation.

## Key component states

- **Authority Card:** active, nearly depleted, expired, and revoked.
- **Transaction row:** pending, confirmed, blocked by policy, failed onchain.
- **Network balance:** loading, funded, insufficient balance, unavailable.
- **Sponsored gas:** eligible, estimating, sponsored, sponsorship denied.
- **Wallet connection:** disconnected, creating account, ready, error.

## Copy direction

- Lead with authority and consequence: “Agent can spend $3.40 more today.”
- Explain rejection precisely: “Blocked because $20 exceeds the $1 per-payment cap.”
- Use “Sponsored gas” instead of “Free transaction.”
- Keep chain mechanics in expandable detail after the primary result.
- Never call the product a marketplace.

## Responsive behavior

- At 1024px and above, use the two-column control layout.
- Below 1024px, place the Authority Card before the activity ledger.
- Below 640px, collapse navigation, stack balances, and preserve full-width revoke and demo controls.
- Tables become stacked transaction records rather than horizontal scrolling data grids.

## Implementation direction

- Next.js with TypeScript.
- Tailwind CSS for tokens and layout.
- shadcn/ui and Radix primitives for accessible controls, dialogs, drawers, and tooltips.
- Lucide icons.
- Motion only for meaningful state transitions.
- A lightweight chart or CSS meter for allowance usage; no 3D or canvas dependency.

## First build slice

Build one responsive dashboard with truthful disconnected and empty states before connecting wallets:

1. App shell and shared identity header.
2. Dual-network balance card.
3. Authority Card with allowance meter and revoke state.
4. Approved and blocked payment controls.
5. Empty activity ledger reserved for verified account events.

Review the slice at desktop and mobile widths. After the flow reads clearly, connect it to the real account and transaction state without redesigning the surface.

## Finish checks

- A first-time viewer can identify the owner, agent, allowance, and two networks in ten seconds.
- The approved and blocked outcomes remain distinguishable without color.
- Keyboard focus, contrast, loading, error, and long-address states are visible.
- The same tokens can be reused for the landing page and documentation later.
