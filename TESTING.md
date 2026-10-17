# Testing

## Layers

- Unit: authorization scopes, URL/robots policy, deterministic website analysis, opportunity generation, scoring/classification, provider registries, validation
- Component: accessibility and state of reusable UI
- Integration: generated migrations, PostgreSQL constraints, invitation safety, CSV idempotency, durable audit queue lifecycle, opportunity materialization/idempotency, and tenant-scoped queries against ephemeral PGlite (PostgreSQL in WebAssembly)
- API: authentication, authorization, validation, error contracts, idempotency
- E2E: landing, login, protected redirects, onboarding, discovery, and milestone user journeys

## Commands

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` are required gates. Playwright needs Chromium (`pnpm exec playwright install chromium`). PGlite applies the real generated migrations without requiring a system PostgreSQL installation; live OAuth/database E2E remains a deployment-environment gate.

Tests must prove behaviour at boundaries, especially cross-workspace denial and role restrictions. A test that merely mirrors implementation is not sufficient.
