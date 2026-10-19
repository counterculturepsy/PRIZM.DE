# M9 analytics plan and acceptance criteria

## Objective

Deliver workspace-scoped, reproducible reporting over existing authoritative PRIZM.DEV records. The first M9 slice is read-only and adds no analytics warehouse, tracking pixel, third-party telemetry, or inferred business event.

## Metric contract (`analytics-v1`)

Every report captures one `asOf` instant and displays the workspace timezone. Seven-, 30-, and 90-day windows are inclusive of records created on or after `asOf - N days`. Currency values are grouped by the currency stored on each deal; unlike currencies are never added together or converted.

- **Discovered companies:** company records by `companies.created_at`.
- **CRM leads:** all current workspace-owned lead records.
- **Current stage distribution:** one current deal stage per CRM lead. This is a snapshot, not a history of transitions.
- **Proposal coverage:** distinct leads with at least one proposal divided by CRM leads.
- **Won conversion:** current won deals divided by CRM leads. This is a snapshot ratio, not a cohort conversion rate.
- **Open pipeline value:** non-terminal deals (`identified` through `negotiation`) with a recorded value, grouped by currency.
- **Won value:** current won deals with a recorded value, grouped by currency. This is not recognized revenue.
- **Closed-cycle time:** average elapsed days from lead creation to `deals.closed_at` for current won/lost deals that have a closing timestamp.
- **Source coverage:** distinct companies by source provider. A company may appear under more than one provider, so provider counts are not additive. Unattributed companies have no source record.
- **Top industries/cities:** current company record values, with blank values excluded.

## Deliberate boundaries

- Replies and meetings are unavailable because M5 has no event types for them and M8 delivery is disabled.
- Historical stage-to-stage conversion is unavailable because the current activity schema does not persist a normalized transition event suitable for cohort analytics.
- Recognized revenue, cash collected, refunds, and tax are unavailable because M9 precedes the M10 billing/payment ledger.
- Reports expose aggregate operational data only; they do not return contact details, message bodies, or applicant/private data.
- No result may silently truncate rows. Database aggregates produce complete workspace totals.

## Routes and access

| Route | Access | Purpose |
| --- | --- | --- |
| `/app/reports/sales` | Active workspace member | Pipeline stage, proposal, won conversion, and closed-cycle reporting |
| `/app/reports/leads` | Active workspace member | Discovery windows, source coverage, and market composition |
| `/app/reports/revenue` | Owner/Admin | Open and won deal value with a clear no-revenue-ledger warning |

The server resolves membership and creates a trusted `WorkspaceScope`. Every query filters on that scope. Revenue authorization is checked server-side and the route is hidden with a 404 for unauthorized roles.

## Design

Reports use the existing dark PRIZM.DEV card system, restrained cyan/violet data accents, semantic headings, tabular currency alignment, responsive grids, visible caveats, keyboard-safe links, and text labels that do not rely on colour alone.

## Acceptance criteria

- [x] All three routes render authenticated, workspace-scoped aggregate data.
- [x] Revenue reporting is restricted to Owner/Admin on the server.
- [x] Cross-workspace fixtures cannot affect another workspace's metrics.
- [x] Metric version, captured time, timezone, currency behavior, and limitations are visible.
- [x] Values group by stored currency and do not imply foreign-exchange conversion.
- [x] Won value is never labelled recognized revenue.
- [x] Empty workspaces render useful zero/empty states.
- [x] No schema migration is introduced because this slice derives metrics from existing authoritative tables.
- [x] Unit/integration, lint, strict typecheck, production build, and protected-route browser smoke tests pass.
