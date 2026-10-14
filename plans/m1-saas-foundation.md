# M1 SaaS Foundation Plan

Status: implementation complete; live-provider validation pending.

## Delivered sequence

1. Replaced JWT-only identity with the Drizzle-backed Auth.js adapter and database sessions.
2. Extended the append-only schema with workspace preferences, onboarding, services, ICPs, and hashed invitations.
3. Added server-resolved active workspace selection; the browser cookie is a selector, never authorization.
4. Added transactional workspace creation, owner membership, onboarding state, ICP seed, and audit events.
5. Added permission-aware onboarding, settings, team invitations, and invitation acceptance.
6. Added the responsive dashboard/navigation shell and honest future-milestone states.
7. Added ephemeral PostgreSQL migration, isolation, uniqueness, and invitation regression tests.

## Exit criteria

- Database session schema and adapter typecheck.
- First-time users can create a workspace and complete onboarding when OAuth/PostgreSQL are configured.
- Active workspace selection is verified against an active server-side membership.
- Owner/Admin/Sales/Developer/Viewer capabilities deny unauthorized writes.
- Invitation tokens are stored only as hashes, expire, match authenticated email, and cannot downgrade members.
- Migration checks, lint, typecheck, tests, production build, and available browser smoke tests pass.

## External validation gate

Apply migrations to a provisioned PostgreSQL instance, configure an OAuth client, and exercise signup through invitation acceptance in a deployment preview before treating M1 authentication as production validated.
