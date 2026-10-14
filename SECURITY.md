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

## Required before production

M2 is not production-ready. Before launch: provision a managed PostgreSQL database, configure and live-test approved OAuth callbacks, add rate limiting and explicit origin review for mutations, select and contractually approve any external discovery provider, establish retention/lawful-basis policy for imported business contacts, add durable audit delivery, encrypted integration-token storage with key rotation, dependency/security scanning, CSP tuned to deployed providers, monitoring, backups and restore drills, privacy workflows, abuse controls, and an external tenant-isolation review.

## Authorization rules

Authentication is not authorization. The server resolves active membership for every tenant request. Owner/Admin manage workspace configuration; Sales handles CRM/outreach within policy; Developer handles technical audits; Viewer is read-only. High-risk actions require explicit capability checks and audit records.

## Outreach and data use

Only compliant/public APIs, user imports, and permissibly public data sources may be used. No uncontrolled scraping. Store source attribution, honour suppression/opt-out state, deduplicate, rate-limit, and require human review. POPIA/GDPR readiness is a design requirement, not a legal-compliance claim.

Report vulnerabilities privately to the repository owner; do not open a public issue containing exploit details or data.
