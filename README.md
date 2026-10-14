# PRIZM.DEV

PRIZM.DEV is a workspace-safe client-acquisition operating system for developers and digital agencies. Its product principle is simple: **do not give users more leads; give them better opportunities.**

This repository contains the M0 architecture, M1 SaaS foundation, and M2 tenant-owned prospect database. Database-backed identity, isolated workspaces, onboarding, roles, invitations, services, ICP settings, bounded CSV company imports, search filters, saved searches, provenance, and responsive company profiles are implemented. External discovery providers, audits, scoring, CRM, outreach, and proposals remain gated roadmap capabilities.

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
