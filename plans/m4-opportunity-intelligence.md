# M4 — Opportunity intelligence implementation plan

## Outcome

Convert completed M3 audit findings into tenant-owned, evidence-backed opportunities and a transparent lead score. M4 is deterministic: it does not call an AI provider, invent prices, guarantee outcomes, or contact a prospect. AI-assisted drafts remain deferred to M6 and require human review.

## Architecture

1. Pure scoring functions convert observed finding impacts and configured ICP matches into versioned score components.
2. Pure generation rules group supported findings into opportunity types with conservative business-impact and recommendation language.
3. A server-only materializer loads one tenant/audit graph, calculates intelligence, and persists it transactionally and idempotently.
4. An audit-completion hook attempts materialization after M3 commits; materialization failure is logged without corrupting the completed audit. The same operation can be rerun safely.
5. Tenant-scoped queries expose a ranked feed and a company detail report. They never reveal whether another workspace owns a supplied identifier.

## Database schema

### Enums

- `lead_priority`: `low`, `possible`, `good`, `high`, `priority`
- `opportunity_type`: `website_improvement`, `accessibility_remediation`, `seo_improvement`, `security_hardening`, `performance_optimization`, `mobile_experience`

### `lead_scores`

- Immutable audit/version calculation plus an `is_current` pointer for the company feed.
- Stores `total_score` (0–100), priority, a constrained JSON component breakdown, `scoring_version`, and `calculated_at`.
- Unique per `(workspace_id, audit_id, scoring_version)` and at most one current score per workspace company.
- Composite tenant foreign keys bind company and audit to the same workspace.

### `opportunities`

- Links one supported opportunity type to a company and source audit.
- Stores title, summary, business impact, recommended solution, confidence, and generation version.
- Optional price guidance is copied only from a matching active workspace service and retains its service ID and currency. Missing catalogue prices remain `null`.
- Unique per `(workspace_id, audit_id, type, generation_version)` for safe regeneration.

### `opportunity_evidence`

- Relational join between an opportunity and its source findings.
- Includes `workspace_id` and `audit_id`; composite constraints prevent cross-tenant and cross-audit evidence links.
- Raw HTML and unvalidated UUID arrays are not stored.

## Lead scoring v1

Higher scores mean stronger observable opportunity, not better website health or a guaranteed sales result.

- Audit need: sum of source finding `score_impact`, capped at 60.
- Evidence breadth: two points per affected audit category, capped at 10.
- Configured target-industry match: 15 points.
- Configured target-city match: 10 points.
- Supplied public contact readiness: 5 points when an email or phone exists.
- Total is clamped to 0–100 and every non-zero component explains its points.

Priority thresholds are inclusive and versioned: `low` 0–29, `possible` 30–49, `good` 50–69, `high` 70–84, `priority` 85–100.

## Deterministic opportunity rules

Findings are grouped by their observed category: accessibility, SEO/content, security, performance, and mobile. Remaining supported web findings become a general website-improvement opportunity. Each persisted opportunity links to every source finding used by its rule. Confidence is the lowest confidence among its evidence so uncertainty is never hidden.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/app/discover/opportunities` | Active member | Ranked current opportunity feed |
| `/app/companies/[companyId]/opportunities` | Active member | Company score, components, recommendations, and evidence |

## Design-system extension

- Reuse the M0 near-black, graphite, violet, cyan, and semantic status tokens.
- Scores use Geist Mono and text labels; colour is never the only priority indicator.
- Opportunity cards show evidence count, confidence, observation time, and an explicit non-guarantee note.
- Feed and detail layouts remain usable on mobile, keyboard navigable, and compatible with reduced motion.

## Acceptance criteria

- Completed or partial M3 audits can be materialized without any network or AI call.
- Reprocessing the same audit/version does not duplicate scores or opportunities.
- Every opportunity has at least one same-tenant, same-audit evidence link.
- Every lead score exposes a complete component breakdown whose points sum to the stored total.
- Price estimates remain absent unless backed by a matching active workspace service; copied values use integer minor units and workspace currency.
- Feed ordering is current-score descending, tenant scoped, deterministic, and bounded.
- Company intelligence routes return not-found across a tenant boundary.
- Database constraints reject cross-workspace company, audit, service, opportunity, and evidence relationships.
- Unit tests cover priority boundaries, scoring components, ICP matches, opportunity grouping, confidence, and pricing behavior.
- Integration tests cover migration application, materialization, idempotency, feed ordering, and cross-tenant denial.
- Lint, strict typecheck, all tests, production build, dependency audit, and desktop/mobile smoke tests pass.

## Production gates

- M4 is decision support, not automated qualification or outreach. Humans remain responsible for validating relevance, lawful basis, pricing, and contact decisions.
- Scores and recommendations must be recalculated under a new version when rules change; historical versions are retained.
- Managed PostgreSQL migration, realistic staging data, independent tenant-isolation review, monitoring, and policy review remain required before production claims.
