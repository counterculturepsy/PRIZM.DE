# Architecture

## Current state

The upstream repository was an empty placeholder containing only a README. M0 establishes a single deployable Next.js application with domain-oriented modules. A monorepo is deferred until independently deployable services or packages justify the operational cost.

## System boundaries

```text
Browser
  -> Next.js route handlers / server components
     -> authentication + workspace authorization
        -> domain services
           -> tenant-scoped repositories -> PostgreSQL
           -> provider ports -> compliant external APIs / AI providers
           -> job port -> future durable worker
```

UI code may call application services but never the database or provider SDKs directly. Provider adapters return attributed, confidence-bearing observations. Domain services convert observations into findings and recommendations. Communication remains draft-only until a human confirms sending.

## Repository layout

- `src/app`: routes, layouts, and HTTP boundaries
- `src/components`: reusable UI primitives and composed presentation
- `src/config`: validated runtime configuration
- `src/modules`: domain contracts and use cases
- `src/server`: authentication, database, authorization, and server-only adapters
- `tests/e2e`: black-box smoke journeys
- `drizzle`: generated immutable migrations

## Tenancy request path

1. Authenticate the user server-side.
2. Resolve workspace membership from the database.
3. Construct a branded `WorkspaceScope` from trusted membership data.
4. Pass that scope into every tenant-owned repository operation.
5. Filter and mutate by both record identifier and `workspace_id`.
6. Record sensitive changes in the append-only audit log.

Client-supplied workspace IDs are selectors, never proof of access. Future PostgreSQL row-level security is a defence-in-depth layer, not a replacement for application authorization.

## Application route map

| Route | Access | Milestone | Purpose |
| --- | --- | --- | --- |
| `/` | Public | M0 | Truthful marketing page |
| `/login` | Public | M0 | OAuth entry and configuration state |
| `/app` | Authenticated | M0–M2 | Protected shell and dashboard |
| `/app/onboarding` | Member | M1 | Services, regions, ICP, budget |
| `/app/discover/search` | Member | M2 | Prospect search |
| `/app/discover/map` | Member | M2 deferred | Geographic view after an approved map provider is configured |
| `/app/discover/opportunities` | Member | M4 | Ranked opportunity feed |
| `/app/discover/saved` | Member | M2 | Saved searches |
| `/app/leads` | Member | M2/M5 | Filtered lead list |
| `/app/leads/[leadId]` | Member | M4/M5 | Lead workspace |
| `/app/companies/[companyId]` | Member | M2 | Company profile and evidence |
| `/app/audits` | Member | M3 | Audit queue/history |
| `/app/audits/[auditId]` | Member | M3 | Evidence-backed audit report |
| `/app/ai/strategy` | Member | M6 | Sales strategy drafts |
| `/app/ai/outreach` | Member | M6 | Reviewed outreach drafts |
| `/app/ai/proposals` | Member | M7 | Proposal generation |
| `/app/crm/pipeline` | Member | M5 | Deal kanban |
| `/app/crm/companies` | Member | M5 | CRM companies |
| `/app/crm/contacts` | Member | M5 | Attributed contacts |
| `/app/crm/tasks` | Member | M5 | Tasks and follow-ups |
| `/app/crm/activity` | Member | M5 | Activity timeline |
| `/app/campaigns` | Sales/Admin | M8 | Controlled campaigns |
| `/app/campaigns/sequences` | Sales/Admin | M8 | Sequences and steps |
| `/app/campaigns/templates` | Member | M8 | Message templates |
| `/app/reports/sales` | Member | M9 | Sales analytics |
| `/app/reports/leads` | Member | M9 | Lead analytics |
| `/app/reports/revenue` | Admin/Owner | M9 | Revenue reporting |
| `/app/settings/profile` | Member | M1 | User profile |
| `/app/settings/services` | Admin/Owner | M1 | Service catalogue |
| `/app/settings/icp` | Admin/Owner | M1 | Ideal customer profile |
| `/app/settings/integrations` | Admin/Owner | M8 | Encrypted integrations |
| `/app/settings/ai` | Admin/Owner | M6 | Provider policy, no raw keys in UI |
| `/app/settings/billing` | Owner | M10 | Subscription and usage |
| `/app/settings/team` | Admin/Owner | M1 | Members and roles |
| `/api/health` | Public | M0 | Non-sensitive liveness |
| `/api/auth/[...nextauth]` | Public | M0 | Auth.js protocol routes |
| `/api/v1/*` | Scoped | M1+ | Versioned integrations and mutations |

## Design system

PRIZM.DEV uses a near-black technical canvas without gaming-style decoration. Tokens live in `src/app/globals.css` and are shadcn-compatible (`background`, `foreground`, `card`, `primary`, `muted`, `border`, `ring`, semantic status colours). Electric violet is the sole primary action; cyan and magenta are restrained data accents.

- Type: Geist Sans for UI, Geist Mono for evidence, scores, and technical metadata.
- Radius: 8–16px; panels use subtle borders instead of heavy shadows.
- Spacing: 4px base grid with generous 24–64px section rhythm.
- Motion: short opacity/transform transitions and reduced-motion opt-out.
- Focus: visible 2px violet/cyan ring with offset.
- Contrast: body text and controls target WCAG 2.2 AA.
- Prism motif: a low-opacity geometric refraction used in brand surfaces only.

## Architecture decisions

- **Single app first:** simpler deploys and transactions; module boundaries preserve a future split.
- **Drizzle/PostgreSQL:** explicit SQL-shaped schema, reviewed migrations, typed queries.
- **Database-backed Auth.js sessions:** identity, sessions, and workspace membership use PostgreSQL; OAuth adapters remain isolated and fail closed when configuration is absent.
- **Controlled discovery first:** M2 accepts bounded, explicitly supplied CSV data; provider adapters remain unavailable until approved and configured.
- **Fail-closed providers:** no provider key means the adapter is unavailable, never a fabricated response.
- **Jobs behind a port:** queue vendor selection is deferred until M3 workload characteristics are known.
