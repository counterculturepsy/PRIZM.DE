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

## Planned domain schema

| Domain | Tables | Ownership and key constraints |
| --- | --- | --- |
| Profile | `services`, `ideal_customer_profiles`, `onboarding_progress` | implemented; workspace scoped; service slug unique per workspace |
| Discovery | `companies`, `company_sources`, `discovery_runs`, `saved_searches` | implemented; workspace; company and source keys deduplicated within workspace |
| Contacts | `contacts`, `suppression_entries` | workspace; source/confidence required; normalized contact hashes indexed |
| Web intelligence | `websites`, `website_audits`, `audit_findings`, `technologies` | workspace; evidence and observed time required |
| Opportunity | `opportunities`, `leads`, `lead_scores` | workspace; score explanations immutable per scoring version |
| CRM | `deals`, `activities`, `tasks`, `notes`, `meetings` | workspace; all foreign keys include same-tenant validation |
| Outreach | `campaigns`, `sequences`, `sequence_steps`, `email_templates`, `messages` | workspace; suppression and human-review checks before send |
| Proposals | `proposals`, `proposal_items` | workspace; pricing snapshots use integer minor units |
| Platform | `integrations`, `notifications`, `subscriptions`, `usage_records`, `audit_logs` | workspace; integration tokens encrypted and never selected by default |

## Isolation rules

Every table above except global identity/reference tables contains non-null `workspace_id` and an index beginning with it. Unique business keys are composite with `workspace_id`. Repositories do not expose unscoped `findById` methods. Updates and deletes use `WHERE id = ? AND workspace_id = ?`. Cross-tenant foreign-key relationships are rejected in the application transaction and should use composite database constraints where supported.

Workspace deletion is a reviewed asynchronous workflow: suspend access, export if requested, tombstone external sends, delete tenant data in dependency order, retain only legally required redacted audit metadata, and record completion. Database resets are never part of deployment.

## Evidence and confidence

Facts from external sources store provider, source URL or stable source reference, `observed_at`, confidence, and whether the value is observed, user-supplied, inferred, or unknown. AI output never overwrites observed facts.

## Migration policy

Generate migrations with `pnpm db:generate`, review SQL, test against a disposable database, and apply with `pnpm db:migrate`. Never edit an applied migration. Required columns added to populated tables use a staged nullable/backfill/not-null sequence.
