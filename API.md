# API conventions

Application routes use server components/actions for first-party UI and `/api/v1` route handlers for integrations or explicit HTTP clients. M2 exposes only Auth.js routes and `GET /api/health`; discovery imports and saved searches are authenticated server actions, not public endpoints.

## M2 action contracts

- CSV imports accept `.csv` files up to 1 MB and 500 data rows. `name` is required; every other header must be on the documented allowlist. Imports require workspace `write` capability.
- Saved-search create/delete actions require workspace `write` capability and scope every lookup and mutation by the active workspace.
- Company search/profile reads require an active workspace membership and never reveal whether a company UUID exists in another tenant.
- External discovery APIs are not exposed until a provider has approved credentials, contractual permission, bounded requests, rate limits, and operational monitoring.

## M3 audit contracts

- Audit requests are authenticated server actions requiring workspace `write` capability, a tenant-owned company website, and explicit authorization acknowledgement.
- Requests create a durable audit and leased job; they do not perform network work in the browser request.
- `pnpm audit:worker` processes at most one eligible job. It fails closed unless `WEBSITE_AUDIT_ENABLED=true` and a complete server environment is present.
- No public worker or crawl endpoint is exposed. Scheduling, concurrency, and rate controls belong to the deployment environment.

Future JSON responses use `{ data, meta }`; errors use `{ error: { code, message, requestId, fieldErrors? } }`. Never return stack traces, SQL details, secrets, provider payloads, or record existence across a tenant boundary.

Mutations validate content type, body size, origin where appropriate, Zod schema, authenticated membership, capability, rate limit, and idempotency key where retries are possible. Pagination uses opaque cursors. Dates are ISO 8601 UTC. Money is integer minor units plus currency. Externally visible IDs are opaque UUIDs.

Provider callbacks and payment/email webhooks require signature verification and replay protection before parsing business data. Version breaking changes under a new path; additions remain backward compatible.
