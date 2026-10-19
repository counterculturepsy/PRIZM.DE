# PRIZM.DEV

PRIZM.DEV is a workspace-safe client-acquisition operating system for developers and digital agencies. Its product principle is simple: **do not give users more leads; give them better opportunities.**

This repository contains M0 architecture through M7, the M8 campaign safety control plane, and the M9 analytics foundation. Database-backed identity, isolated workspaces, onboarding, roles, bounded company imports, provenance, durable audit jobs, bounded static analysis, evidence reports, deterministic opportunity rules, explainable lead scores, tenant-safe CRM, evidence-grounded strategy/outreach drafts, and immutable human-approved proposal snapshots are implemented. Campaign preparation adds templates, sequence plans, deduplicated recipient enrollments, suppression readiness and human review under `/app/campaigns`. The provider-independent delivery control plane adds immutable message snapshots, leased jobs, runtime caps, hashed unsubscribe links, and replay-safe normalized event records. Tenant-safe reports add discovery/source, current pipeline, proposal, won-value, and cycle-time aggregates under `/app/reports/*`. No approved provider adapter or live send path exists. Audit, AI, campaign delivery, external discovery, recognized-revenue reporting, public proposal delivery, signatures, payments, and calendar integrations remain gated capabilities.

## Stack

- Next.js App Router, React, and strict TypeScript
- Tailwind CSS with shadcn-compatible design tokens
- PostgreSQL and Drizzle ORM
- Auth.js/NextAuth authentication foundation
- Zod environment and boundary validation
- Vitest and Playwright
- GitHub Actions CI

## Start locally

1. Install Node.js 22+ and pnpm 11+.
2. Copy `.env.example` to `.env.local` and replace every development placeholder.
3. Start PostgreSQL and create the configured database.
4. Run `pnpm install`.
5. Run `pnpm db:generate` and `pnpm db:migrate`.
6. Run `pnpm dev` and open `http://localhost:3000`.

Do not enable `WEBSITE_AUDIT_ENABLED` for ordinary local UI work. Approved operators can process one queued audit with `pnpm audit:worker` only after the egress, crawler identity, monitoring, and policy gates in `SECURITY.md` are satisfied.

Do not enable `AI_GENERATION_ENABLED` or add a live provider key merely for local validation. M6 tests use mocked transport. External generation additionally requires an explicit compatible model, an enabled workspace policy, data-processing and lawful-use approval, authorized staging evaluation, monitoring, and production governance.

`CAMPAIGN_DELIVERY_ENABLED` is intentionally rejected when true in this release. The delivery worker/service foundation is testable only with injected fake providers; a live adapter requires provider approval, a verified sender, encrypted credentials, signed webhooks, monitoring and authorized staging validation.

OAuth sign-in is exposed only when a complete provider pair is configured. The protected application shell lives at `/app`; a first-time user creates a workspace and completes onboarding before importing an approved company CSV at `/app/discover/search`. Materialized M4 recommendations are available at `/app/discover/opportunities`; they can become M5 leads without initiating outreach. CRM work is available under `/app/leads` and `/app/crm/*`. M6 review-only drafts live under `/app/ai/*`, and M7 proposal versions live under `/app/proposals`; neither area sends messages. M9 reports are read-only aggregates. Won deal value is deliberately not described as recognized revenue because no invoice/payment ledger exists before M10.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [SECURITY.md](SECURITY.md), [ENVIRONMENT.md](ENVIRONMENT.md), and [ROADMAP.md](ROADMAP.md) before extending the system.
