# M6 — Evidence-grounded sales drafts

## Contract before implementation

Outcome: authenticated members generate, inspect, and review saved strategy or outreach drafts for a tenant-owned CRM lead. The configured OpenAI adapter implements the existing AIProvider port, requests strict JSON Schema output, validates it again with Zod, and handles refusal, timeout, truncation, and malformed responses. Disabled configuration fails closed. No synthetic AI fallback or sending exists.

## Data and tenancy

- `ai_workspace_policies`: one row per workspace; enabled flag and daily request limit (1–100). Owner/Admin manage it. Default disabled.
- `ai_draft_runs`: workspace, lead, purpose, idempotency key, lifecycle, provider/model/prompt version, sanitized failure code, evidence snapshot, structured output, usage, duration, actor and reviewer metadata. Composite lead/member keys enforce tenant references. Only completed drafts may be approved/rejected, once, with an audit event.
- Reserve a daily request under a workspace row lock before any provider call. Reservations include failures and abandoned requests, bounding spend even after process crashes. UTC day and a per-request 2,000 output-token cap; no automatic retries. Request counts are a budget proxy, not a monetary cap.
- Snapshots retain up to 12 bounded findings from the current scored audit, with immutable IDs, observation times, confidence, category, and excerpt. No CRM contacts, notes, tasks, user emails, or suppression data enter the prompt.

## Flow

Resolve active membership and write capability -> validate lead/purpose/request key -> tenant-owned current-audit evidence -> enabled policy and atomic daily reservation -> bounded provider call outside transaction -> validate structure and evidence ID allowlist -> persist completed output or sanitized failure -> human approves/rejects with audit event. Approval records review only.

## Routes and design

- `/app/ai/strategy`: lead selector, evidence consent acknowledgement, generation, saved strategy history.
- `/app/ai/outreach`: the same workflow for outreach drafts.
- `/app/ai/drafts/[draftId]`: structured output, provider provenance, evidence snapshot, lifecycle and review form.
- `/app/settings/ai`: Owner/Admin policy; other roles cannot modify it. Keys remain server environment only.
- Reuse existing dark tokens, cards, labels, focus rings and responsive layouts. Status uses text. Failures are actionable and never expose upstream payloads.

## Acceptance

1. Disabled provider/policy never calls the network; no fabricated output.
2. Budget reservations and idempotency prevent duplicate requests; concurrent quota use is serialized by workspace.
3. Generation and review deny Viewer and cross-tenant access at service and action boundaries.
4. Only server-selected redacted evidence reaches the provider. Observed web text is untrusted data and cannot change instructions. Output references only supplied evidence IDs.
5. Every substantive output section cites evidence; no unknown references; plain-text rendering with no HTML execution. Human review remains necessary to detect unsupported claims.
6. Provider model, prompt version, usage and source snapshots persist. Refusal, incomplete, oversized, malformed and network failures produce safe failed runs without automatic retry.
7. Approval/rejection is an audited conditional transition on completed drafts; approved drafts have no send operation.
8. Unit tests cover redaction, evidence validation and provider failures; PGlite tests apply migration and prove quota/idempotency/tenant/role/review behavior. Lint, typecheck, tests, build and desktop/mobile auth smoke pass.

## External gates

OpenAI key, explicitly selected compatible model, approved data-processing policy, realistic authorized staging evaluation, live OAuth/PostgreSQL journey and production operational controls are required before enabling external generation. No live API spend is required for local validation.
