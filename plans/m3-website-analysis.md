# M3 — Website analysis implementation plan

## Outcome

Allow an authorized workspace member to request a bounded review of a company website, process that request through a durable PostgreSQL job, and read an accessible evidence report. The system must fail closed on unsafe destinations, robots restrictions, missing authorization, or disabled worker configuration.

## Architecture

1. `websites` stores the canonical public HTTP(S) origin for a tenant-owned company.
2. `website_audits` stores the request, policy version, lifecycle, diagnostic score, timestamps, and sanitized failure state.
3. `audit_jobs` is a durable, leased, retry-limited PostgreSQL queue. A worker claims one job atomically and can recover expired leases.
4. `audit_pages` records bounded fetch metadata without retaining raw HTML.
5. `audit_findings` records category, severity, observed evidence, source URL, confidence, and scoring version.
6. A provider port separates job orchestration from the HTTP implementation and enables deterministic, network-free integration tests.

## Fetch policy

- Only explicit, user-requested company websites are eligible; no discovery crawl or link following.
- HTTP and HTTPS only, no credentials, fragments, localhost, private/reserved IP space, or non-standard ports.
- Resolve and validate every destination and redirect before connecting.
- Respect `robots.txt`; unavailable or ambiguous policy fails closed.
- Identify the crawler with a configured user agent and fetch one HTML document only.
- Limit redirects, duration, robots bytes, response bytes, and accepted content types.
- Do not execute JavaScript, submit forms, authenticate, bypass controls, or retain raw page bodies.

## Initial deterministic checks

- document title and meta description
- language and viewport declarations
- heading structure and image alternative text
- form labels
- canonical URL
- HTTPS and selected security headers
- response status, content type, transfer size, and fetch duration

The report calls its aggregate a versioned diagnostic score, not a guaranteed performance, accessibility, SEO, security, or commercial outcome.

## Acceptance criteria

- A writer can queue an audit only after explicit authorization acknowledgement for a tenant-owned company URL.
- Duplicate active requests for the same workspace website are rejected without leaking other-tenant records.
- Jobs persist in PostgreSQL, use bounded attempts and leases, and recover an expired lease.
- Unsafe destinations and redirect targets are rejected before page retrieval.
- Robots policy is evaluated before page retrieval and a disallow result produces a blocked audit.
- Successful and partial audits persist page evidence, findings, observed timestamps, policy/scoring versions, and a score from 0–100.
- Raw HTML, cookies, credentials, secrets, and full response bodies are not stored or logged.
- Audit list/report routes are responsive, keyboard accessible, and tenant scoped.
- Unit and integration tests cover URL policy, robots decisions, findings, queue lifecycle, retries, partial failure, and cross-tenant access.
- Lint, strict typecheck, tests, production build, dependency audit, and desktop/mobile smoke tests pass.

## Production gates

- The worker remains disabled by default until managed PostgreSQL, an approved deployment egress policy, a public support contact in the crawler user agent, rate limiting, monitoring, and legal/provider review are configured.
- Lighthouse/browser-rendered analysis and multi-page crawling are deferred until their resource, consent, and queue requirements are validated.
