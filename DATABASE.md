# Database and tenancy model

PostgreSQL is authoritative. Drizzle migrations are append-only after application. IDs use UUIDs; timestamps are UTC `timestamptz`; money is stored as integer minor units plus ISO currency; evidence payloads use constrained JSON only where relational columns are not practical.

## Implemented physical schema

- `users`: identity profile only; no tenant-owned business data
- `workspaces`: tenant root and lifecycle status
- `workspace_members`: many-to-many membership with Owner/Admin/Sales/Developer/Viewer role
- `accounts`, `sessions`, `verification_tokens`: Auth.js-compatible identity records
- `audit_logs`: immutable workspace event metadata with redacted payloads
- `workspace_invitations`: hashed, expiring invitations restricted to the intended authenticated email
- `services`: tenant-owned service catalogue and non-authoritative sales price guidance
- `ideal_customer_profiles`: tenant-owned regions, industries, company-size and budget preferences
- `onboarding_progress`: per-workspace completion state
- `companies`: tenant-owned company records deduplicated by normalized domain or identity
- `company_sources`: immutable source attribution, fact kind, confidence, observed time, and constrained snapshot
- `discovery_runs`: import/provider execution history and result status
- `saved_searches`: tenant-owned reusable company filters
- `websites`: canonical tenant/company website targets
- `website_audits`: authorization basis, policy/scoring versions, lifecycle, score, and sanitized failure state
- `audit_jobs`: durable leased jobs with bounded attempts and retry scheduling
- `audit_pages`: response metadata and fetch status without raw HTML
- `audit_findings`: observed evidence, category, severity, confidence, and score impact
- `lead_scores`: versioned, explainable audit/ICP score history with one current score per company
- `opportunities`: deterministic recommendations linked to a company, audit, and optional configured service price
- `opportunity_evidence`: same-tenant, same-audit relational links to source findings
- `leads`, `deals`: one tenant/company lead and its server-authoritative pipeline state
- `contacts`, `suppression_entries`: attributed business contacts, normalized deduplication, and future-send safety state
- `crm_notes`, `crm_tasks`, `crm_activities`: bounded notes, follow-ups, and append-only CRM history
- `ai_workspace_policies`: disabled-by-default workspace policy and bounded UTC daily request limit
- `ai_draft_runs`: tenant-owned quota reservations, immutable redacted evidence snapshots, structured output, provider provenance, usage, safe failure state, and conditional human review
- `proposals`: tenant/lead-owned proposal identity, current version, lifecycle, creator and conditional approval metadata
- `proposal_versions`: append-only client-visible scope, deliverables, terms guidance, line items and server-authoritative pricing snapshots
- `campaign_templates`, `campaigns`, `campaign_steps`, `campaign_recipients`: immutable content, reviewed preparation, ordered sequence and attributed audience snapshots
- `campaign_messages`, `campaign_delivery_usage`: immutable staged messages, leased retry state, provider idempotency and serialized UTC daily reservations
- `campaign_unsubscribe_tokens`, `campaign_provider_events`: one-way token hashes and replay-safe normalized delivery outcomes without raw provider payloads

## Derived analytics

M9 adds no tables or migration. `analytics-v1` performs exact, read-only PostgreSQL aggregates over `companies`, `company_sources`, `leads`, `deals`, and `proposals`, always filtered by trusted `workspace_id`. This preserves one source of truth and avoids premature duplicated counters. A future warehouse or materialized view requires its own reconciliation, freshness, tenant-isolation, retention, and migration design.

## Planned domain schema

Later milestones add analytics, billing, integration credential storage and production operations. Provider secrets are not part of the campaign schema.

| Domain | Tables | Ownership and key constraints |
| --- | --- | --- |
| Profile | `services`, `ideal_customer_profiles`, `onboarding_progress` | implemented; workspace scoped; service slug unique per workspace |
| Discovery | `companies`, `company_sources`, `discovery_runs`, `saved_searches` | implemented; workspace; company and source keys deduplicated within workspace |
| Contacts | `contacts`, `suppression_entries` | implemented in M5; workspace/company provenance; normalized values deduplicated; suppression unique per workspace/channel/value |
| Web intelligence | `websites`, `website_audits`, `audit_jobs`, `audit_pages`, `audit_findings` | implemented; workspace; evidence, source URL, observed time, policy and scoring versions required |
| Opportunity | `opportunities`, `opportunity_evidence`, `lead_scores` | implemented in M4; workspace/audit evidence constraints; score explanations immutable per version |
| CRM | `leads`, `deals`, `crm_activities`, `crm_tasks`, `crm_notes` | implemented in M5; composite tenant references, one lead/deal per company, append-only history; meetings deferred |
| AI drafts | `ai_workspace_policies`, `ai_draft_runs` | implemented in M6; workspace/lead/member composite references, request-key idempotency, bounded evidence snapshots, provider provenance, and review-only lifecycle |
| Proposals | `proposals`, `proposal_versions` | implemented in M7; workspace/lead/member composite references, idempotent creation, serialized append-only versions, server-calculated totals, and privileged approval |
| Outreach | `campaign_templates`, `campaigns`, `campaign_steps`, `campaign_recipients`, `campaign_messages`, `campaign_delivery_usage`, `campaign_unsubscribe_tokens`, `campaign_provider_events` | implemented M8 control plane; tenant-composite references, review/staging freeze, suppression recheck, leased/capped claims, token/event replay protection; live provider absent |
| Platform | `integrations`, `notifications`, `subscriptions`, `usage_records`, `audit_logs` | workspace; integration tokens encrypted and never selected by default |

## Isolation rules

Every table above except global identity/reference tables contains non-null `workspace_id` and an index beginning with it. Unique business keys are composite with `workspace_id`. Repositories do not expose unscoped `findById` methods. Updates and deletes use `WHERE id = ? AND workspace_id = ?`. Cross-tenant foreign-key relationships are rejected in the application transaction and should use composite database constraints where supported.

Workspace deletion is a reviewed asynchronous workflow: suspend access, export if requested, tombstone external sends, delete tenant data in dependency order, retain only legally required redacted audit metadata, and record completion. Database resets are never part of deployment.

## Evidence and confidence

Facts from external sources store provider, source URL or stable source reference, `observed_at`, confidence, and whether the value is observed, user-supplied, inferred, or unknown. AI output never overwrites observed facts.

## Migration policy

Generate migrations with `pnpm db:generate`, review SQL, test against a disposable database, and apply with `pnpm db:migrate`. Never edit an applied migration. Required columns added to populated tables use a staged nullable/backfill/not-null sequence.
