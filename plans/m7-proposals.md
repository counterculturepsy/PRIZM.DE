# M7 — Versioned proposals

## Contract before implementation

Outcome: workspace members turn a tenant-owned CRM lead into a reviewable proposal with immutable versions, server-authoritative totals, privileged approval, and accessible print export. M7 has no email, public share link, signature, payment, or send operation.

## Data and lifecycle

- `proposals` owns identity, tenant/lead relationship, title, current version, lifecycle, creator and approver metadata.
- `proposal_versions` is append-only. Each row snapshots client-visible summary, scope, deliverables, assumptions, exclusions, timeline, currency, line items and server-calculated totals.
- Creating a revision inserts the next version under a proposal row lock and returns the proposal to `draft`; prior snapshots never change.
- Owner/Admin approve the current draft version with a review note. Approval is a conditional transaction and audit event. Any later revision requires a new approval.
- Currency comes from the workspace. Quantities, unit amounts and discounts are bounded integers; the server calculates every total and ignores browser totals.

## Routes

- `/app/proposals`: list and create proposals from tenant-owned CRM leads.
- `/app/proposals/[proposalId]`: inspect current and historical versions, revise, and approve.
- `/app/proposals/[proposalId]/print`: semantic print-ready rendering of the selected immutable snapshot.

## Acceptance

1. Cross-tenant reads, writes, revisions, approval and export fail closed.
2. Viewer cannot mutate; Sales/Developer may draft; only Owner/Admin may approve.
3. Browser totals are never accepted. Overflow, negative values, unsupported currency and excessive discounts are rejected.
4. Approved snapshots remain immutable; revisions create a new version and clear current approval state.
5. Repeated create requests are idempotent per workspace request key; concurrent version creation is serialized.
6. Approval conditionally targets only the current draft version and records reviewer, note and audit metadata.
7. Print export contains the immutable server snapshot and clearly states that it is a proposal, not a guarantee or invoice.
8. Migration, unit/integration tests, lint, typecheck, build and desktop/mobile protected-route smoke pass.

## External gates

Legal terms, tax treatment, quote validity policy, real customer review, branded PDF rendering, public sharing, e-signature and delivery remain separate reviewed capabilities. M7 does not send proposals.
