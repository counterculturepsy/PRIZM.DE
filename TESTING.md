# Testing

## Layers

- Unit: authorization scopes, URL/robots policy, deterministic website analysis, opportunity generation, scoring/classification, CRM validation/normalization/lifecycle rules, provider registries
- Component: accessibility and state of reusable UI
- Integration: generated migrations, PostgreSQL constraints, invitation safety, CSV idempotency, durable audit queue lifecycle, opportunity materialization/idempotency, CRM transaction/idempotency/suppression behaviour, and tenant-scoped queries against ephemeral PGlite (PostgreSQL in WebAssembly)
- API: authentication, authorization, validation, error contracts, idempotency
- E2E: landing, login, protected redirects including CRM, responsive smoke coverage, onboarding, discovery, and milestone user journeys

## Commands

M8 unit tests cover sequence order/delay/cap rules, header injection, the disabled provider and token hashing. PGlite tests apply migrations `0008`–`0009` and prove campaign idempotency, cross-tenant constraints, role denial, duplicate enrollment, later suppression/address changes, immutable staging, leased daily caps, provider-event replay protection and atomic unsubscribe suppression. Protected campaign routes and public unsubscribe screens are tested on desktop and mobile. No test invokes a live provider; authenticated staging delivery remains an external gate.

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` are required gates. Playwright needs Chromium (`pnpm exec playwright install chromium`). PGlite applies the real generated migrations without requiring a system PostgreSQL installation; live OAuth/database E2E remains a deployment-environment gate.

Tests must prove behaviour at boundaries, especially cross-workspace denial and role restrictions. A test that merely mirrors implementation is not sufficient.
