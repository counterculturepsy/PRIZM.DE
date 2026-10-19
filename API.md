# API conventions

Application routes use server components/actions for first-party UI and `/api/v1` route handlers for integrations or explicit HTTP clients. The application currently exposes only Auth.js routes and `GET /api/health`; discovery, audit, and opportunity workflows remain authenticated server-side operations rather than public endpoints.

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

## M4 opportunity-intelligence contracts

- Opportunity and score reads are authenticated server-component queries scoped by trusted active workspace membership.
- Materialization accepts a tenant-owned completed or partial audit ID, performs no provider or AI call, and is idempotent for its scoring/generation version.
- Every recommendation returns relational source evidence. Price guidance is nullable and may only be copied from an active service configured by the same workspace.
- Scores describe observable opportunity strength, not website quality, sales probability, or a guaranteed commercial outcome.

## M5 CRM contracts

- CRM reads require active workspace membership. Mutations additionally require workspace `write` capability, so Viewer remains read-only.
- Lead creation accepts only a company owned by the active workspace and an optional same-company, same-workspace opportunity. Repeated creation returns the existing lead rather than duplicating it.
- Contact creation requires explicit source metadata and at least one bounded email or phone value. PRIZM does not discover, enrich, or verify the legal usability of contact data in M5.
- Deal stage, note, task, completion, and suppression mutations transactionally record an append-only CRM activity and audit-log event.
- Suppression stores a normalized workspace-wide channel/value pair for future M8 enforcement. M5 exposes no send action or provider callback.

## M6 AI sales-assistant contracts

- Strategy and outreach generation are authenticated server actions requiring workspace `write` capability, explicit evidence-transfer acknowledgement, and a tenant-owned CRM lead.
- The server selects and redacts current audit evidence. Browser-supplied evidence, provider/model names, workspace IDs, prompt text, totals, and review state are not trusted.
- AI must be enabled by both validated server configuration and an Owner/Admin workspace policy. A workspace row lock serializes idempotency and UTC daily-budget reservation before a provider call.
- Provider responses use strict structured output, secondary schema validation, and an evidence-ID allowlist. Refusal, incomplete, oversized, malformed, timeout, and network failures fail closed with sanitized codes.
- Draft review is a conditional, audited transition available to members with `write` capability. Approval records human review only; M6 exposes no send endpoint or integration callback.

## M7 proposal contracts

- Proposal creation and revision require workspace `write` capability and a tenant-owned CRM lead. Request keys make proposal creation idempotent.
- Proposal versions are append-only snapshots. A revision is serialized under a proposal row lock, increments the version, and returns the proposal to draft without changing earlier snapshots.
- Workspace currency is authoritative. The server validates quantity, unit amount and discount, calculates every line total and aggregate, and accepts no browser-supplied totals.
- Only Owner/Admin may conditionally approve the current draft. Approval records reviewer, note, timestamp, version and audit metadata; any revision requires approval again.
- Print routes render the tenant-scoped immutable snapshot and label it as a proposal rather than an invoice or guarantee. M7 exposes no public link, signature, payment or send endpoint.

## M8 campaign preparation contracts

- Owner/Admin/Sales may create campaign drafts, immutable text templates, ordered steps, and attributed recipient enrollments. Developer/Viewer have read access only. Every mutation rechecks current membership in the service.
- Campaign creation is idempotent per workspace/request key; conflicting reuse is rejected. Enrollment deduplicates contact and email per campaign. Preparation has a maximum audience of 100 and configurable daily cap of 1–100.
- Workspace email suppression and do-not-contact flags block enrollment. Readiness/review rechecks both suppression and changed contact email snapshots. Removing enrollment preserves contact/suppression records.
- Only Owner/Admin may record preparation review with a note, after current readiness passes. Audience/sequence changes clear review. Every mutation is audited without contact values in audit metadata.
- Owner/Admin-only staging materializes immutable step/recipient message snapshots and freezes the campaign. It is a server service boundary, not a public launch endpoint.
- The delivery service uses leased claims, stable provider idempotency keys, bounded retry metadata and atomic UTC daily reservations. It rechecks review state, the current address, do-not-contact and workspace suppression immediately before calling an injected provider port.
- `GET /unsubscribe/[token]` is a non-mutating confirmation page. Its server action consumes a one-way-hashed, expiring, single-use token and creates idempotent workspace-wide suppression; responses do not reveal the address.
- Provider event ingestion is server-only and accepts only already signature-verified normalized events. Unique provider/event IDs prevent replay; only a SHA-256 payload digest and bounded identifiers are stored, never a raw webhook body.
- No live provider adapter, callback route, campaign-launch action or deployable delivery worker is exposed. `CAMPAIGN_DELIVERY_ENABLED=true` fails environment validation in this release.

## M9 analytics contracts

- Reports are authenticated server-component reads. They accept no browser-supplied workspace identifier; trusted active membership provides the workspace scope.
- `/app/reports/sales` and `/app/reports/leads` require active membership. `/app/reports/revenue` additionally requires Owner/Admin and returns a 404 to other roles.
- All totals are exact database aggregates without list pagination or silent caps. Source provider counts use distinct companies and may overlap across providers.
- Every snapshot has metric version `analytics-v1`, one server-captured as-of instant, workspace timezone metadata, and currency groups based on stored deal currency. Currencies are never combined or converted.
- M9 exposes no public analytics endpoint, raw contact data, message content, tracking pixel, third-party telemetry, historical reply/meeting claim, or recognized-revenue claim.

Future JSON responses use `{ data, meta }`; errors use `{ error: { code, message, requestId, fieldErrors? } }`. Never return stack traces, SQL details, secrets, provider payloads, or record existence across a tenant boundary.

Mutations validate content type, body size, origin where appropriate, Zod schema, authenticated membership, capability, rate limit, and idempotency key where retries are possible. Pagination uses opaque cursors. Dates are ISO 8601 UTC. Money is integer minor units plus currency. Externally visible IDs are opaque UUIDs.

Provider callbacks and payment/email webhooks require signature verification and replay protection before parsing business data. Version breaking changes under a new path; additions remain backward compatible.
