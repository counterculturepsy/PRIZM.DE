# PRIZM.DEV

PRIZM.DEV is a workspace-safe client-acquisition operating system for developers and digital agencies. Its product principle is simple: **do not give users more leads; give them better opportunities.**

This repository contains M0 architecture, the M1 SaaS foundation, M2 tenant-owned prospect database, and the M3 website-analysis pipeline. Database-backed identity, isolated workspaces, onboarding, roles, bounded company imports, search, saved searches, provenance, durable audit jobs, bounded static analysis, and evidence reports are implemented. The audit worker is disabled by default; external discovery, opportunity scoring, CRM, outreach, and proposals remain gated roadmap capabilities.

## Stack

- Next.js App Router, React, and strict TypeScript
- Tailwind CSS with shadcn-compatible design tokens
- PostgreSQL and Drizzle ORM
- Auth.js/NextAuth authentication foundation
- Zod environment and boundary validation
- Vitest and Playwright
- GitHub Actions CI

## Start locally

1. Install Node.js 22+ and pnpm 11+.
2. Copy `.env.example` to `.env.local` and replace every development placeholder.
3. Start PostgreSQL and create the configured database.
4. Run `pnpm install`.
5. Run `pnpm db:generate` and `pnpm db:migrate`.
6. Run `pnpm dev` and open `http://localhost:3000`.

Do not enable `WEBSITE_AUDIT_ENABLED` for ordinary local UI work. Approved operators can process one queued audit with `pnpm audit:worker` only after the egress, crawler identity, monitoring, and policy gates in `SECURITY.md` are satisfied.

OAuth sign-in is exposed only when a complete provider pair is configured. The protected application shell lives at `/app`; a first-time user creates a workspace and completes onboarding before importing an approved company CSV at `/app/discover/search`.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [SECURITY.md](SECURITY.md), [ENVIRONMENT.md](ENVIRONMENT.md), and [ROADMAP.md](ROADMAP.md) before extending the system.
