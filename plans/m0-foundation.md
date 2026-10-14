# M0 Foundation Construction Plan

Status: active

## Invariants

1. Every tenant-owned persistent record carries `workspace_id`.
2. Every tenant query receives a verified workspace scope; no workspace is inferred from browser input alone.
3. Provider results retain source, evidence, confidence, and observation time.
4. No external communication or destructive action happens without explicit human review.
5. Server credentials never enter client bundles or logs.

## Dependency graph

```text
Architecture decisions
  -> schema and tenancy contract
  -> environment/auth/provider contracts
  -> app and design foundations
  -> tests and CI
  -> M0 verification gate
```

## Step 1 — Record architecture decisions

Deliver `ARCHITECTURE.md`, full route map, design tokens, M0 acceptance criteria, and ADRs. Exit when product scope and security boundaries are explicit enough for a fresh engineer to extend safely.

## Step 2 — Establish repository and runtime

Add Next.js App Router, strict TypeScript, Tailwind, reusable primitives, environment validation, safe headers, and a minimal truthful marketing/application shell. Exit when lint and typecheck pass.

## Step 3 — Establish data and identity foundations

Add Drizzle/PostgreSQL configuration, the M0 auth/workspace/audit schema, Auth.js route, protected route helper, role model, and workspace-scope guard. Exit when a generated migration is reviewable and scope tests pass.

## Step 4 — Establish replaceable providers

Add AI and discovery/audit provider interfaces with disabled defaults. Exit when provider selection fails closed and contract tests pass.

## Step 5 — Establish delivery gates

Add unit/component/E2E scaffolding, smoke coverage, CI, security/environment/database/API documentation, and exact local verification. Exit only when lint, typecheck, tests, build, and feasible smoke tests pass.

## Rollback

If a dependency proves incompatible, revert only its isolated adapter/configuration while preserving documented contracts and schema history. Never rewrite an applied database migration.

## Mutation protocol

Record scope changes in `CHANGELOG.md`; update affected acceptance criteria before code. New provider-specific or feature work belongs to M1+ and may not weaken the invariants above.
