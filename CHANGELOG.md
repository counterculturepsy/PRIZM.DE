# Changelog

All notable changes follow Keep a Changelog. The project has not released a stable API.

## Unreleased

### Added

- M0 architecture, route map, database/tenancy model, design system, security, AI, API, environment, testing, and roadmap documentation
- Next.js/TypeScript/Tailwind application foundation
- Drizzle/PostgreSQL auth, workspace, membership, and audit schema
- Auth.js, workspace authorization, provider contracts, tests, and CI foundations
- M1 database-backed Auth.js adapter, workspace creation/switching, onboarding, service catalogue, ICP settings, team roles, and expiring hashed invitations
- Responsive authenticated shell with loading, empty, error, and permission-aware states
- PGlite integration coverage for migrations, tenant isolation, uniqueness, and invitation downgrade prevention
- M2 tenant-owned company database, source provenance, discovery-run history, and saved searches
- Bounded CSV ingestion with allowlisted columns, deterministic deduplication, and import audit events
- Company discovery filters, saved-search workflow, company profiles, and permission-aware responsive navigation
- M3 website targets, durable leased audit jobs, page evidence, findings, and versioned diagnostic scores
- SSRF-aware public destination policy, robots handling, bounded single-page HTTP provider, and disabled-by-default worker
- Accessible audit request, history, queued/blocked/partial states, and evidence report routes
- M4 versioned lead scores, deterministic opportunity rules, same-audit evidence links, and catalogue-backed nullable price guidance
- Ranked opportunity feed and company opportunity reports with complete score explanations and non-guarantee language
- Composite PostgreSQL constraints covering M4 company, audit, service, opportunity, and finding relationships
