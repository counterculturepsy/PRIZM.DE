# Roadmap and acceptance criteria

## M0 — Architecture and foundation — complete

- Repository boots with supported Node/pnpm and contains no secrets.
- Current/proposed architecture, full route map, design system, data model, API, AI, environment, testing, and security boundaries are documented.
- Next.js App Router, strict TypeScript, Tailwind/shadcn-compatible tokens, reusable primitives, Auth.js route, Drizzle/PostgreSQL schema, workspace scope, provider contracts, tests, and CI exist.
- Lint, typecheck, unit tests, production build, and core smoke E2E pass.
- M0 UI labels future capabilities honestly; no fake operational metrics or providers.

## M1 — SaaS foundation — implemented, external validation pending

Authenticated users can create/select a workspace, complete onboarding, invite members, and enforce roles. Database-backed sessions/memberships and tenant-isolation integration tests pass. Dashboard and settings have loading, empty, error, mobile, and keyboard states.

Implementation and ephemeral PostgreSQL tests are complete. Applying migrations to managed PostgreSQL and running a real OAuth signup/invitation journey remain deployment-environment gates.

## M2 — Prospect database — implemented, external provider validation pending

Users can import bounded, approved CSV datasets; filter workspace-owned South African company records by keyword, industry, province, and city; save searches; and view profiles with source attribution and confidence. Imports are idempotent and tenant scoped. Live provider-backed discovery remains disabled until a compliant provider, credentials, contractual permissions, and rate limits are configured.

Acceptance evidence: append-only migration `0002`, CSV validation/deduplication unit tests, tenant-isolation/idempotency integration tests, authenticated discovery routes, responsive browser smoke coverage, and a passing production build.

## M3 — Website analysis — implemented, production worker disabled by default

Authorized single-page reviews run through durable leased PostgreSQL jobs with retry limits, public-destination enforcement, redirect revalidation, robots policy, byte/time limits, and no link following. Audits capture structured evidence, timestamps, versioned diagnostic scores, partial or blocked states, and accessible reports without retaining raw HTML.

Acceptance evidence: append-only migration `0003`, URL/robots/analyzer unit tests, PGlite queue and cross-tenant integration coverage, authenticated audit list/report routes, and the `audit:worker` entry point. Production processing remains disabled until managed PostgreSQL, approved egress, monitoring, rate limiting, a public crawler contact, and legal/policy review are configured.

## M4 — Opportunity intelligence — implemented, staging validation pending

Versioned deterministic scoring explains every point. Opportunities link observed findings to conservative business impact, recommendations, confidence, and a nullable price range copied only from a matching workspace service. Relational evidence and composite foreign keys enforce tenant and source-audit boundaries; no AI provider or outreach is invoked.

Acceptance evidence: append-only migration `0004`, priority/scoring/generator unit tests, PGlite idempotency and cross-tenant/cross-audit integration coverage, ranked feed and company report routes, and automatic failure-isolated materialization after successful M3 processing. Managed PostgreSQL, realistic staging data, independent tenant-isolation review, monitoring, and policy review remain production gates.

## M5 — CRM — implemented, production governance pending

Tenant-owned companies can become deduplicated CRM leads with a deal pipeline, attributed contacts, notes, follow-up tasks, an append-only activity timeline, and workspace-wide suppression records. All writes require role capability checks and atomically record activity and audit metadata. M5 has no outbound sending, automated contact discovery, or calendar integration.

Acceptance evidence: append-only migration `0005`, CRM validation and normalization unit tests, PGlite mutation/idempotency/cross-tenant integration coverage, authenticated responsive CRM routes, and passing production/browser gates. Managed PostgreSQL, lawful-basis and retention policy review, rate limiting, monitoring, backups, and independent tenant-isolation/privacy review remain production gates.

## M6 — AI sales assistant — implemented, external provider validation pending

Strategies and outreach are schema-validated, evidence-grounded drafts with provider budgets, provenance, and mandatory human review. The provider and workspace policy both default to disabled, every request reserves quota, and approval records review only; M6 has no send operation.

Acceptance evidence: append-only migration `0006`, redaction/grounding/provider unit tests, PGlite quota/idempotency/tenant/role/review coverage, authenticated strategy/outreach/review/policy routes, and fail-closed environment validation. Approved model selection, lawful-use and data-processing review, authorized staging evaluation, managed PostgreSQL/OAuth validation, monitoring, and production governance remain external gates.

## M7 — Proposals

Versioned proposals snapshot scope/pricing, require human approval, and export accessibly without representing estimates as guarantees.

## M8 — Campaigns

Integrations, templates, sequences, suppression, unsubscribe, bounce handling, sending caps, deduplication, and auditability are operational before any bulk send.

## M9 — Analytics

Workspace-scoped, reproducible metrics cover sources, funnel, revenue, and cycle time with timezone/currency definitions.

## M10 — Billing

Plans, subscriptions, entitlements, and usage are server-authoritative; signed idempotent webhooks and reconciliation tests pass.

## M11 — Production hardening

Threat review, rate limits, CSP, observability, alerts, backup restore, privacy export/deletion, load testing, dependency scanning, provider production approvals, and independent tenant-isolation QA are complete.
