# Manda Documentation

Manda is a human-owned smart-account payment identity that gives an AI agent narrow, revocable authority. These documents separate the product promise, implemented system, verified evidence, and deferred work.

## Start here

- [Product requirements](PRD.md) explains the user problem, audience, product behavior, and success criteria.
- [Architecture](ARCHITECTURE.md) explains ownership, delegated execution, chain integrations, and security boundaries.
- [Agent service API](API.md) documents authentication, request schemas, responses, and policy errors.
- [Security model](SECURITY.md) records protected assets, trust boundaries, enforcement layers, and prototype limits.
- [Testing status](TESTING-STATUS.md) is the source of truth for automated checks and onchain evidence.

## Product and delivery

- [Hackathon scope](SCOPE.md) defines the locked demo path and explicit deferrals.
- [Build tasks](TASKS.md) tracks implementation and submission work.
- [Hackathon alignment](HACKATHON.md) maps the product to the event and sponsor tracks.
- [Product design](DESIGN.md) describes the information architecture and required states.
- [Frontend direction](FRONTEND-DIRECTION.md) defines the visual system and responsive behavior.

## Public documentation

The built site includes a detailed reference at `/docs.html`, an interactive agent connection guide at `/agent.html`, and a machine-readable project map at `/llms.txt`. They are generated from tracked source files under `frontend/` and `public/`.

## Evidence hierarchy

When documents disagree, use this order:

1. Confirmed transaction receipts and explorer records listed in [Testing status](TESTING-STATUS.md).
2. Current automated tests and implementation code.
3. Architecture and API documentation.
4. Product requirements, scope, and task planning documents.

Planning language does not override the verified implementation state.
