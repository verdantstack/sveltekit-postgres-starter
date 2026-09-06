# AGENTS.md — AI Agent Context for SvelteKit + Postgres Starter

> This file tells AI coding agents everything they need to work effectively in this codebase.

## Project Overview

A production-shaped B2B SaaS foundation for SvelteKit + Postgres with multi-tenancy wired end-to-end. Implements organizations, invitations, role-based access control, seat-based billing, and an append-only audit log — on real Postgres (Drizzle ORM + postgres.js), with opt-in Row-Level Security hardening.

**Status:** v0.1.0 — 194 tests passing against a real Postgres test database, svelte-check clean, production build clean.

## Quick Commands

```bash
docker compose up -d     # Postgres 16: dev :5433 + test :5434
cp .env.example .env     # DATABASE_URL + TEST_DATABASE_URL defaults
npm install
npm run db:migrate       # apply drizzle/ migrations to DATABASE_URL
npm run dev              # Start dev server (http://localhost:5173)
npm test                 # vitest suite (194 tests, real Postgres via TEST_DATABASE_URL)
npm run check            # run svelte-check (TypeScript validation)
npm run build            # production build
npm run db:generate      # generate SQL migrations after schema.ts changes
```

## Architecture

```
routes (+page.server.ts)      → thin: parse form → call service → fail/redirect
        ↓
services (orgs/members/invites)  → domain logic, pure functions, Db passed in
        ↓
rbac.ts / billing/            → policy + payment seams
        ↓
db/index.ts                   → postgres.js + drizzle + migrations (auto at boot)
```

### Critical Rules

1. **Routes NEVER touch the database directly** — all writes go through services
2. **Services are framework-free** — import nothing from `@sveltejs/kit`
3. **Every mutating service call re-derives authority** — callers pass `actorRole`, fetched fresh inside the same request
4. **Errors carry machine codes** — `AuthError`, `RbacError`, `InviteError`, `MemberError`, `OrgError`, `BillingError`
5. **One error mapper** — `lib/server/http.ts:errorToFail()` turns errors into HTTP responses
6. **Tenancy is app-enforced by default** — RLS in `rls/` is opt-in hardening, not the runtime tenancy boundary

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/db/schema.ts` | Drizzle Postgres schema — users, sessions, organizations, memberships, invites, audit_log |
| `src/lib/server/db/index.ts` | postgres.js driver + Drizzle handle + auto-migrations; `openDb()`/`createDb()`/`getDb()` |
| `drizzle/` | Checked-in SQL migrations (applied via `migrate()` at boot) |
| `rls/` | Opt-in Row-Level Security policies (defense-in-depth; see docs/deployment.md) |
| `src/lib/server/rbac.ts` | Roles, permission matrix (`MATRIX`), hierarchy helpers (`mayActOn`/`mayGrant`) |
| `src/lib/server/auth.ts` | scrypt hashing, session issue/verify/revoke |
| `src/lib/server/ratelimit.ts` | `RateLimiter` interface + sliding-window implementation |
| `src/lib/server/http.ts` | `errorToFail()` — maps domain errors to HTTP responses |
| `src/lib/server/services/` | Domain logic: orgs, members, invites (pure functions taking `Db`) |
| `src/lib/server/billing/` | `BillingAdapter` interface, mock implementation, wiring point |
| `tests/` | Vitest suites against a real Postgres test database |
| `docker-compose.yml` | Local Postgres (dev :5433 + test :5434) |

## RBAC Model

**Roles:** `owner` (rank 2) > `admin` (rank 1) > `member` (rank 0)

**Hierarchy rules (enforced everywhere):**
1. Act downward only — `rank(actor) > rank(target)`
2. Grant strictly below yourself — `rank(actor) > rank(granted)`
3. No self-modification
4. Single-owner invariant — last owner cannot leave or be removed

**Capability matrix** (in `rbac.ts` `MATRIX`):
- `owner`: all permissions
- `admin`: org.view, members.view, members.invite, members.remove*, members.role.set*, invites.revoke, audit.view
- `member`: org.view, members.view

*subject to hierarchy rules

## Database

- **Driver:** postgres.js (async, pooled; pool size via `PG_MAX_CONNECTIONS`)
- **ORM:** Drizzle (`drizzle-orm/postgres-js`), typed as `Db = PostgresJsDatabase<typeof schema>`
- **Connection:** `DATABASE_URL`; migrations applied automatically at boot via `createDb()`/`openDb()` and on demand via `npm run db:migrate`
- **Types:** `uuid` primary keys (app-generated UUIDv4), Unix epoch **milliseconds** as `bigint` (UTC), JSON metadata stored as text (`jsonb` is the documented upgrade path)
- **Tenancy:** enforced in the service layer; RLS policies are opt-in (`rls/0010_rls_policies.sql`)

### Key Schema Tables
- `users` — email + scrypt password hash
- `sessions` — sha256(token) as PK, user_id, expiry
- `organizations` — name, slug
- `memberships` — org_id, user_id, role (unique on org_id + user_id)
- `invites` — org_id, token_hash, role, expiry, accepted/revoked timestamps
- `audit_log` — org_id, actor_user_id, action, metadata (append-only, no UPDATE/DELETE)

## Testing

- **Framework:** Vitest
- **Database:** real Postgres at `TEST_DATABASE_URL` (docker-compose's `test-db` on :5434); apply migrations once, truncate tracked tables per test
- **Run:** `npm test`
- **Current count:** 194 tests across 9 suites
- **Isolation:** `tests/helpers/test-db.ts` — `createTestDb()` truncates `audit_log, invites, memberships, organizations, sessions, users` with `RESTART IDENTITY CASCADE`; `fileParallelism: false` so files run sequentially

### Test Files
| File | Coverage |
|------|----------|
| `tests/auth.test.ts` | Password hashing, session lifecycle, expiry |
| `tests/rbac.test.ts` | Matrix pinning, hierarchy rules |
| `tests/orgs-members.test.ts` | Org CRUD, membership management, slug rules |
| `tests/invites-seats.test.ts` | Invite lifecycle, seat limits, TTL, email normalization |
| `tests/ratelimit.test.ts` | Sliding-window semantics, eviction |
| `tests/http.test.ts` | HTTP-level flows, error mapping, redirect safety |
| `tests/billing.test.ts` | Seat counting/limits, mock adapter contract |
| `tests/audit.test.ts` | Append-only audit, metadata, pagination, history survival |
| `tests/smoke.test.ts` | Migration + user-creation verification |

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | (required) | Postgres connection string (app) |
| `TEST_DATABASE_URL` | (required for tests) | Postgres connection string (test DB) |
| `PG_MAX_CONNECTIONS` | `20` | Connection pool size |
| `PG_IDLE_TIMEOUT` | `20` | Idle-connection close timeout (s) |
| `PG_CONNECT_TIMEOUT` | `10` | Connection timeout (s) |
| `MOCK_PLAN_SEATS` | `3` | Seat limit for MockBilling |
| `AUTH_FAILED_ATTEMPTS` | `5` | Failed attempts per window |
| `AUTH_WINDOW_MS` | `900000` | Sliding window (15 min) |

## Code Style

- TypeScript strict mode
- Server-side enforcement everywhere
- Errors use typed error classes (not strings)
- Timestamps in milliseconds, UTC only
- No ORM lock-in at service boundaries (services accept any `Db`)

## Common Patterns

### Adding a new service action
1. Add the permission to `MATRIX` in `rbac.ts` if needed
2. Create the service function in `src/lib/server/services/`
3. Accept `Db` as first argument, `actorRole` as needed
4. Call `requirePermission()` before any write
5. Write audit log entry in the same service call
6. Add tests in `tests/`

### Adding a new route
1. Create `+page.server.ts` in the route directory
2. Parse form data / URL params
3. Call service functions (never touch DB directly)
4. Handle errors via `errorToFail()`
5. Return redirects or data

### Modifying the schema
1. Edit `src/lib/server/db/schema.ts`
2. Run `npm run db:generate` to create migration SQL
3. Review the generated SQL in `drizzle/`
4. Migrations apply automatically at boot (and via `npm run db:migrate`)

## Build & CI

- **CI:** GitHub Actions — Postgres 16 service container → install → test → docs gate → check → build
- **Build:** `npm run build` (adapter-auto; pin a platform adapter for production)
- **Tests require a reachable Postgres** (service container in CI, docker-compose locally)