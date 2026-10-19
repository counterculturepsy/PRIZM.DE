# M8 — Campaign preparation and readiness

## Outcome and boundary

Members prepare email campaigns, reusable plain-text templates, ordered follow-up steps and deduplicated recipient enrollments. Owner/Admin record human review after readiness checks. Delivery remains unavailable until an approved email provider, verified sender, signed replay-safe webhooks, unsubscribe endpoint, bounce processing, sending worker, rate controls and monitoring exist. This slice does not claim completion of the full M8 sending milestone.

## Schema and tenancy

- `campaign_templates`: immutable plain-text subject/body; tenant/member references and length constraints. Editing creates a new template so existing steps retain their content.
- `campaigns`: name, request key, draft/reviewed lifecycle, daily recipient cap (1–100), review note/reviewer/time. Any sequence or recipient change clears review.
- `campaign_steps`: positions 1–10, cumulative delay days 0–90, same-tenant campaign/template references, unique campaign position. Positions must be contiguous and delays nondecreasing at review time.
- `campaign_recipients`: same-tenant campaign/contact references, normalized email snapshot and manual contact-use basis. Unique campaign/contact and campaign/email prevent duplicates. No private fields enter audit metadata.
- Workspace row locks serialize campaign mutations with membership checks and review; review status is never an authorization to send.

## Service boundary

Owner/Admin/Sales may prepare campaigns; Owner/Admin alone review. Developer/Viewer can read but cannot change campaigns. Every mutation revalidates active membership and workspace, parses Zod input, scopes IDs by tenant and records an audit event transactionally. Creation uses an idempotency key. Suppression is checked during enrollment and again on every readiness read/review, using both contact flags and workspace-wide normalized email entries. Changed email requires reenrollment in a later workflow; stale snapshots block readiness. Duplicate addresses count once; no bulk import or send exists.

## Routes and UI

- `/app/campaigns`: preparation dashboard, create form, clear delivery-disabled state.
- `/app/campaigns/[campaignId]`: steps, recipient selection, readiness, privileged review.
- `/app/campaigns/templates`: reusable immutable plain-text content.
- `/app/campaigns/sequences`: campaign list linking sequence editors.
- Reuse dark PRIZM tokens, accessible form labels, visible focus/status, stacked mobile cards. Show blocked reasons as text and render content as text.

## Acceptance

1. Real migrations apply without changing earlier migrations; composite constraints reject foreign-tenant campaign/template/contact/member references.
2. Idempotent create and recipient enrollment cannot duplicate campaign/email pairs; conflicting request reuse is rejected.
3. Suppressed contacts cannot enroll or pass review. Later suppression or address changes invalidate current readiness even if a prior human review exists.
4. Sequence positions and cumulative delays validate; gaps, empty campaigns, missing recipients or audience above cap block review.
5. Developer/Viewer mutation denial and foreign-tenant reads/writes/review are covered by integration tests.
6. Human review requires Owner/Admin and a note. Any changed audience/sequence resets review. Provider readiness remains blocked regardless of review.
7. Templates never execute HTML or interpolate arbitrary expressions. All inputs bounded; no outbound traffic or message records indicating delivery.
8. Lint/typecheck/unit/integration/build and desktop/mobile protected-route smoke pass. Authenticated staging journey remains explicit if local credentials/database are unavailable.

## Remaining M8 delivery work

Provider adapter/approval, encrypted credentials, verified sender, double-checked contact-use policy, unsubscribe and suppression ingestion, signed/replay-safe bounce webhooks, idempotent delivery/reconciliation, scheduling, worker leases, sending caps, retry policy, monitoring and external staging tests must all pass before sending can be enabled.
