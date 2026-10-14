# M2 — Prospect database implementation plan

## Outcome

Give each workspace a safe prospect database that accepts controlled user datasets today and can add approved discovery providers later without changing tenant, provenance, or UI contracts.

## Delivered slices

1. Append-only Drizzle schema for companies, sources, discovery runs, and saved searches.
2. Strict CSV parser with 1 MB, 500-row, 10,000-character-record, header, URL, email, and field limits.
3. Idempotent imports keyed by normalized domain or name/location identity, plus stable source keys.
4. Tenant-scoped search, South African location/industry filters, saved searches, and company profiles.
5. Source kind, confidence, observed time, and supplied-source URL displayed without implying verification.
6. Provider registry contract ready for configured adapters; all external adapters disabled by default.

## Acceptance criteria

- A writer can import a valid CSV and receives created/updated counts.
- Re-importing the same row does not duplicate its company or source within a workspace.
- The same domain can exist independently in two workspaces.
- Unsupported columns, invalid URLs/emails, malformed CSV, overlong records, oversized files, and more than 500 rows are rejected before persistence.
- A member can filter companies by keyword, industry, province, and city and can open an attributed company profile.
- A writer can save, rerun, and delete a search; a viewer cannot mutate imports or saved searches.
- Every read/update/delete contains workspace scope; a foreign company UUID returns not found.
- No external request, crawl, enrichment, or outbound contact occurs as a side effect of importing or viewing data.
- Lint, strict typecheck, unit/integration tests, production build, and desktop/mobile smoke tests pass.

## Deferred gates

- Live discovery requires a selected provider, permission/terms review, credentials, request budgets, rate limits, failure handling, and production monitoring.
- Managed PostgreSQL migrations and OAuth journeys require deployment credentials and remain external validation gates.
