# Security baseline

## M0 controls

- Strict environment validation and server-only secrets
- Auth.js sessions with configured secret and protected server routes
- Branded workspace authorization scope and deny-by-default roles
- Tenant columns, composite uniqueness, and scoped query conventions
- Zod at trust boundaries
- Security response headers and disabled framework signature
- Immutable audit-log foundation
- Hashed 256-bit invitation tokens, seven-day expiry, intended-email matching, and existing-member downgrade prevention
- Dependency lockfile and least-privilege CI permissions
- Bounded CSV ingestion (1 MB, 500 rows, strict headers and field lengths) with no automatic crawling
- Deterministic per-workspace company/source deduplication and provenance labels
- Audit URL allowlisting, public-IP pinning, private/reserved address denial, and redirect revalidation
- Robots-aware single-page fetches with strict time, redirect, content-type, and byte limits
- Raw website HTML is analyzed in memory and never persisted
- Durable audit leases, bounded retries, sanitized error codes, and worker disabled by default
- Deterministic opportunity rules, relational evidence provenance, nullable catalogue-backed pricing, and composite tenant constraints
- Tenant-scoped CRM references, attributed contact entry, normalized suppression records, transactional activity/audit writes, and read-only Viewer enforcement

## Required before production

M5 is not production-ready. Before launch: provision managed PostgreSQL, configure and live-test OAuth, add rate limiting and explicit origin review for mutations, approve audit-worker egress and DNS controls, publish a crawler contact/policy, configure scheduling and monitoring, validate scoring and CRM workflows against realistic authorized staging data, review robots/terms/legal policy, select any external discovery provider contractually, establish contact-data retention/lawful basis and subject-rights workflows, add encrypted integration-token storage, CSP, backups and restore drills, privacy workflows, abuse controls, and an external tenant-isolation/privacy review.

## Authorization rules

Authentication is not authorization. The server resolves active membership for every tenant request. Owner/Admin manage workspace configuration; Sales handles CRM/outreach within policy; Developer handles technical audits; Viewer is read-only. High-risk actions require explicit capability checks and audit records.

## Outreach and data use

Only compliant/public APIs, user imports, and permissibly public data sources may be used. No uncontrolled scraping. Store source attribution, honour suppression/opt-out state, deduplicate, rate-limit, and require human review. POPIA/GDPR readiness is a design requirement, not a legal-compliance claim.

Report vulnerabilities privately to the repository owner; do not open a public issue containing exploit details or data.
