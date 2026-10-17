# M5 — CRM foundation implementation plan

## Outcome

Turn a tenant-owned company or M4 opportunity into a managed CRM lead. Members with workspace write access can move a deal through a transparent pipeline, add attributed business contacts, record notes, create and complete follow-up tasks, and review an append-only activity timeline. M5 does not discover contacts, send messages, schedule meetings, or infer a lawful basis for outreach.

## Architecture

1. Zod schemas validate every CRM mutation at the server boundary and normalize contact identifiers before persistence.
2. Server-only CRM services enforce a trusted `WorkspaceScope`, load every referenced record through `workspace_id`, and write business changes, activity events, and audit metadata in one transaction.
3. Tenant-scoped query functions return bounded pipeline, contact, task, activity, and lead-detail views. Unknown and cross-tenant identifiers produce the same not-found result.
4. Server actions resolve the active membership and require workspace `write` capability. Viewer access remains read-only.
5. Server components render responsive list, pipeline, and lead-workspace views without exposing an unscoped data API.

## Database schema

### Enums

- `lead_status`: `new`, `qualified`, `unqualified`, `converted`, `archived`
- `deal_stage`: `identified`, `contacted`, `discovery`, `proposal`, `negotiation`, `won`, `lost`
- `crm_activity_type`: `lead_created`, `stage_changed`, `note_added`, `contact_added`, `task_created`, `task_completed`, `contact_suppressed`
- `crm_task_status`: `open`, `completed`, `cancelled`
- `contact_channel`: `email`, `phone`

### `leads`

- One CRM lead per workspace/company, with optional same-company M4 source opportunity.
- Optional owner must be a member of the same workspace.
- Status and timestamps support qualification and archival without deleting history.

### `contacts`

- Tenant/company-owned business contact details with source kind, source label, optional source URL, confidence, and observation time.
- At least one of email or phone is required. Normalized values are used for same-company deduplication.
- `do_not_contact` is an operational safety flag, not proof of consent or legal compliance.

### `deals`

- One pipeline record per lead with stage, optional non-negative value in integer minor units, ISO currency, expected close date, closed time, and optional loss reason.
- Values are planning estimates only and never payment authority.

### `crm_activities`

- Append-only, system-authored timeline events linked to a lead and optional contact.
- Stores concise summaries and timestamps, not email bodies, identity documents, or provider payloads.

### `crm_notes`

- Append-only member notes linked to a lead, with bounded text and author attribution.

### `crm_tasks`

- Follow-up tasks linked to a lead, optional same-workspace assignee, due time, state, and completion time.

### `suppression_entries`

- Workspace-wide normalized email/phone values that must be checked before any future M8 send.
- Records reason, source contact, creator, and creation time; unique per workspace/channel/value.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/app/leads` | Active member; write actions require write capability | Lead list and company-to-lead conversion |
| `/app/leads/[leadId]` | Active member; write actions require write capability | Deal, contacts, notes, tasks, and timeline workspace |
| `/app/crm/pipeline` | Active member | Stage-grouped deal pipeline |
| `/app/crm/companies` | Active member | Redirect to tenant company directory |
| `/app/crm/contacts` | Active member | Attributed contacts and suppression state |
| `/app/crm/tasks` | Active member | Open and completed follow-ups |
| `/app/crm/activity` | Active member | Bounded append-only CRM timeline |

## Design-system extension

- Reuse the M0 near-black, graphite, violet, cyan, and semantic status tokens.
- Pipeline stages use text labels and counts; colour is never the only signal.
- Forms keep visible labels, persistent validation messages, keyboard focus, and minimum touch targets.
- Desktop pipeline columns become a readable stacked flow on narrow screens.
- Contact provenance and suppression state remain visible wherever a contact is shown.

## Acceptance criteria

- A write-capable member can create one lead for a tenant-owned company and optionally preserve its same-company opportunity source.
- Duplicate lead creation is idempotent from the user perspective and never creates duplicate deal/activity rows.
- Pipeline stage changes atomically update the deal, lifecycle timestamps, activity, and audit log.
- Contacts require attributed source metadata and at least one normalized email or phone; duplicate identifiers are rejected within the same company.
- Suppressing a contact atomically marks it do-not-contact and records a workspace-wide normalized suppression entry.
- Notes are append-only; tasks can be created and completed; each mutation creates an activity and audit event.
- Viewer sessions can read CRM views but cannot mutate CRM state.
- Every repository query and mutation scopes by trusted `workspace_id`; cross-tenant IDs return not-found or a domain-safe error.
- Composite database constraints reject cross-workspace company, opportunity, member, lead, contact, task, and suppression relationships.
- Unit tests cover validation, normalization, stage lifecycle rules, and contact safety rules.
- Integration tests cover migration application, idempotent lead creation, mutation audit/activity writes, and cross-tenant denial.
- Lint, strict typecheck, all tests, production build, dependency audit, and desktop/mobile smoke tests pass.

## Production gates

- CRM contact storage is not a legal-compliance claim. A documented lawful basis, retention policy, subject-rights workflow, and legal review remain required.
- No outbound send is implemented. M8 must enforce suppression, unsubscribe, bounce handling, provider approval, caps, idempotency, and human review before any communication.
- Managed PostgreSQL migration, realistic staging data, independent tenant-isolation/privacy review, rate limiting, monitoring, backups, and recovery drills remain required before production claims.
- Calendar/meeting integrations and automated contact discovery remain deferred until approved providers and explicit data-use policies exist.
