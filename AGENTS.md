# AGENTS.md — AI Agent Context for SvelteKit + Postgres Starter

> This file tells AI coding agents everything they need to work effectively in this codebase.

## Project Overview

A production-shaped B2B SaaS foundation for SvelteKit + Postgres with multi-tenancy wired end-to-end. Implements organizations, invitations, role-based access control, seat-based billing, and an append-only audit log — on real Postgres (Drizzle ORM + postgres.js), with opt-in Row-Level Security hardening.

**Status:** v0.1.17 — 547 tests passing against a real Postgres test database, svelte-check clean, production build clean. ≥ 95% coverage enforced (currently 100% statements / 99.26% branches / 100% functions / 100% lines).

## Quick Commands

```bash
docker compose up -d     # Postgres 16: dev :5433 + test :5434
cp .env.example .env     # DATABASE_URL + TEST_DATABASE_URL defaults
npm install
npm run db:migrate       # apply drizzle/ migrations to DATABASE_URL
npm run dev              # Start dev server (http://localhost:5173)
npm test                 # vitest suite (547 tests, real Postgres via TEST_DATABASE_URL)
npm run test:coverage    # Run with coverage enforcement — MUST pass before any commit/release
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
6. **Tenancy is app-enforced by default** — RLS in `rls/` is opt-in hardening, not the runtime tenancy boundary. `rls/0011_deny_data_api_access.sql` is a different thing and is **not** optional on a Supabase-hosted database: it closes the Data API (see Database → Supabase Data API)
7. **Self-service surfaces re-derive the caller** — `/app/sessions` and the audit export read the acting user id from `locals.user` (populated from the httpOnly cookie in `hooks.server.ts`), never from a form field or query parameter
8. **Anything that reads-then-writes across a tenant is serialised** — the org row is locked `FOR UPDATE` as the transaction's first statement (`leaveOrg`, `transferOwnership`, `acceptInvite`). On SQLite this is automatic (one process, one mutex); on Postgres it is not, and a check-then-act that skips the lock is a real race, not a theoretical one

## Key Files

| File                                    | Purpose                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/db/schema.ts`           | Drizzle Postgres schema — users, sessions, organizations, memberships, invites, audit_log                                                                            |
| `src/lib/server/db/index.ts`            | postgres.js driver + Drizzle handle + auto-migrations under a Postgres advisory lock; `openDb()`/`createDb()`/`getDb()`/`poolOptionsFromEnv()`, `MIGRATION_LOCK_KEY` |
| `drizzle/`                              | Checked-in SQL migrations (applied via `migrate()` at boot)                                                                                                          |
| `rls/`                                  | Opt-in RLS policies (`0010`); Supabase Data API lockout (`0011`) + its check (`0011_verify`); see docs/deployment.md |
| `src/lib/server/rbac.ts`                | Roles, permission matrix (`MATRIX`), hierarchy helpers (`mayActOn`/`mayGrant`)                                                                                       |
| `src/lib/server/auth.ts`                | scrypt hashing (N=2^17 per OWASP), session issue/verify/revoke/list/cleanup                                                                                          |
| `src/lib/server/ratelimit.ts`           | `RateLimiter` interface + sliding-window implementation                                                                                                              |
| `src/lib/server/http.ts`                | `errorToFail()` — maps domain errors to HTTP responses                                                                                                               |
| `src/lib/server/services/`              | Domain logic: orgs, members, invites, password-reset, email-verification, files, webhooks, notifications, api-keys, audit-retention, impersonation, blog, affiliates, usage-billing, waitlist, mfa, oauth (pure functions taking `Db`) |
| `src/lib/server/ai/`                    | AI SDK integration (chat endpoint)                                                                                                                                  |
| `src/lib/server/billing/stripe.ts`      | Stripe billing adapter                                                                                                                                              |
| `src/routes/app/settings/`              | User profile & settings                                                                                                                                             |
| `src/routes/app/files/`                 | File upload/storage                                                                                                                                                 |
| `src/routes/app/webhooks/`              | Webhook management                                                                                                                                                  |
| `src/routes/app/notifications/`         | In-app notifications                                                                                                                                                |
| `src/routes/app/api-keys/`              | API keys                                                                                                                                                            |
| `src/routes/app/audit-retention/`       | Audit retention / SIEM export                                                                                                                                       |
| `src/routes/app/admin/`                 | Admin dashboard                                                                                                                                                     |
| `src/routes/app/impersonate/`           | User impersonation                                                                                                                                                  |
| `src/routes/app/mfa/`                   | MFA / 2FA (TOTP)                                                                                                                                                    |
| `src/routes/blog/`                      | Blog / content system                                                                                                                                               |
| `src/routes/landing/`                   | Landing pages                                                                                                                                                       |
| `src/routes/waitlist/`                  | Waitlist                                                                                                                                                            |
| `src/routes/api-docs/`                  | OpenAPI docs                                                                                                                                                        |
| `src/lib/i18n/`                         | i18n (4 locales: en/es/fr/de)                                                                                                                                       |
| `e2e/`                                  | Playwright E2E tests                                                                                                                                                
| `src/routes/app/sessions/`              | "Your sessions": list + revoke your own sessions (caller re-derived from the cookie)                                                                                 |
| `src/routes/app/org/[id]/audit/export/` | `POST` audit-log export (CSV/JSON); writes an `audit.exported` row                                                                                                   |
| `src/lib/server/billing/`               | `BillingAdapter` interface, mock implementation, wiring point                                                                                                        |
| `tests/`                                | Vitest suites against a real Postgres test database                                                                                                                  |
| `docker-compose.yml`                    | Local Postgres (dev :5433 + test :5434)                                                                                                                              |

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

- **Driver:** postgres.js (async, pooled; pool size via `PG_MAX_CONNECTIONS`, idle close via `PG_IDLE_TIMEOUT`, connect timeout via `PG_CONNECT_TIMEOUT` — all three are read by `poolOptionsFromEnv()`)
- **ORM:** Drizzle (`drizzle-orm/postgres-js`), typed as `Db = PostgresJsDatabase<typeof schema>`
- **Connection:** `DATABASE_URL`; migrations applied automatically at boot via `createDb()`/`openDb()` and on demand via `npm run db:migrate`. Both paths run inside the same Postgres advisory lock (`MIGRATION_LOCK_KEY`), so concurrent boot and a pre-deploy step exclude each other rather than racing.
- **Types:** `uuid` primary keys (app-generated UUIDv4), Unix epoch **milliseconds** as `bigint` (UTC), JSON metadata stored as text (`jsonb` is the documented upgrade path)
- **Tenancy:** enforced in the service layer; RLS policies are opt-in (`rls/0010_rls_policies.sql`). The Data API lockout in `rls/0011_deny_data_api_access.sql` is a separate concern and is not opt-in on Supabase — see below.

### Supabase Data API

A Supabase-hosted database serves the **Data API** (PostgREST + GraphQL) over HTTPS for every table in `public`, reachable with the publishable `anon` key. This kit never uses it — direct postgres.js only — so on Supabase the tables are pure attack surface. Supabase's 2026-10-30 grant change only stops *new* tables being auto-granted; it neither affects a direct Postgres connection nor revokes existing grants.

- `rls/0011_deny_data_api_access.sql` — `ENABLE ROW LEVEL SECURITY` on all six tables (**no `FORCE`**: the app is the table owner, and FORCE returns zero rows for an owner without `BYPASSRLS`), `REVOKE ALL` on tables and sequences from `anon`/`authenticated`, plus the same on their default privileges. Guarded by a `pg_roles` check so it is a no-op on plain Postgres. Idempotent; apply as the table owner in one transaction.
- `rls/0011_verify.sql` — paste-and-run read-only check: prints per-table `relrowsecurity` and every privilege `anon`/`authenticated` still hold, then `RAISE EXCEPTION`s (psql exit 3 with `ON_ERROR_STOP=1`) if any public table is still reachable. Expected output is documented in `README.md`.
- `tests/smoke.test.ts` holds the static gate (folded into its existing `it()` so the published test count does not move): every table in `drizzle/*.sql` must appear in an `ENABLE ROW LEVEL SECURITY` statement, `FORCE` and any GRANT to those roles must be absent.
- **Not** tenant isolation: `0011` writes no policies, so a non-owner role gets zero rows rather than its own org's rows. `service_role` keeps BYPASSRLS and its grants by design — never ship that key to a browser. If you later adopt `0010`'s non-owner `app_rw` role, add policies for `users` and `sessions` first, or that role loses access to both.

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
- **Current count:** 547 tests across 27 suites
- **Coverage threshold:** ≥ 95% statements/branches/functions/lines (enforced in `vitest.config.ts`)
- **Coverage command:** `npm run test:coverage` (fails if < 95%; run before every commit)
- **Excluded from coverage:** `db/schema.ts`, `db/index.ts`, `billing/index.ts` (infrastructure, not business logic). `ratelimit.ts` is **included** here — unlike track A, this track's `vitest.config.ts` does not exclude it, and it is covered by `tests/ratelimit.test.ts`.
- **Isolation:** `tests/helpers/test-db.ts` — `createTestDb()` truncates `audit_log, invites, memberships, organizations, sessions, users` with `RESTART IDENTITY CASCADE`; `fileParallelism: false` so files run sequentially
- **One test run at a time.** `fileParallelism: false` only serialises files _within one process_. A second `npm test` (another terminal, a CI shard) would interleave its truncations and produce a wall of foreign-key violations that look like a broken migration. `tests/helpers/test-db-guard.ts` holds a session-scoped advisory lock (`TEST_DB_LOCK_KEY`, deliberately distinct from `MIGRATION_LOCK_KEY`) on a reserved connection, acquired in `globalSetup` and released in teardown, so a concurrent run aborts with one sentence before any test is collected.
- **The container is required.** `npm test` with no Postgres on `TEST_DATABASE_URL` fails with `ECONNREFUSED`; start it with `docker compose up -d test-db` and wait ~10s
- **Cost:** the suite runs against real Postgres **and** real scrypt at N=2^17 (128 MiB, ~0.55s per hash). `npm test` takes roughly 3–4 minutes. That is the price of the OWASP work factor, not a regression to optimise away

### Test Files

| File                                   | Coverage                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tests/auth.test.ts`                   | Password hashing, session lifecycle, expiry                                                                             |
| `tests/rbac.test.ts`                   | Matrix pinning, hierarchy rules                                                                                         |
| `tests/orgs-members.test.ts`           | Org CRUD, membership management, slug rules                                                                             |
| `tests/invites-seats.test.ts`          | Invite lifecycle, seat limits, TTL, email normalization                                                                 |
| `tests/ratelimit.test.ts`              | Sliding-window semantics, eviction                                                                                      |
| `tests/http.test.ts`                   | HTTP-level flows, error mapping, redirect safety                                                                        |
| `tests/billing.test.ts`                | Seat counting/limits, mock adapter contract                                                                             |
| `tests/billing-edge-cases.test.ts`     | Seat upgrades/downgrades, adapter failures, boundary conditions                                                         |
| `tests/rbac-boundary.test.ts`          | Cross-org isolation, rank escalation, hierarchy enforcement                                                             |
| `tests/service-integration.test.ts`    | Full multi-step flows through the service layer                                                                         |
| `tests/audit.test.ts`                  | Append-only audit, metadata, pagination, history survival                                                               |
| `tests/smoke.test.ts`                  | Migration + user-creation verification, plus the static RLS/Data-API gate over `drizzle/*.sql` and `rls/0011` |
| `tests/edge-cases.test.ts`             | Malformed input, normalization, boundary conditions across services                                                     |
| `tests/migration-lock.test.ts`         | Advisory-lock exclusion and handoff, asserted against a live Postgres — not mocked                                      |
| `tests/migration-lock-control.test.ts` | Negative control: a _different_ key is not blocked, which is what keeps the row above falsifiable                       |
| `tests/audit-export.test.ts`           | `countAudit`/`exportAuditCsv`/`exportAuditJson`: CSV round-trip, formula-injection guard, pagination bounds, `Db \| Tx` |
| `tests/routes-export-sessions.test.ts` | The export endpoint (RBAC, 401/403/404, audit row) and the `/app/sessions` surface (no client-supplied identity)        |
| `tests/members-concurrency.test.ts`    | Real concurrent `leaveOrg`/`transferOwnership` against Postgres — the last-owner invariant under races                  |
| `tests/org-slug-collision.test.ts`     | Slug collision is retried into a typed error, not a raw driver 500                                                      |
| `tests/pool-options.test.ts`           | The documented `PG_*` env knobs actually reach the driver; schema-scoped handles pin `max: 1`                           |
| `tests/rls-isolation.test.ts`          | Two-account RLS check against a live Postgres as a real non-superuser role: open-transaction window, fail-closed, and the session-vs-transaction leak pair            |
| `tests/coverage-closures.test.ts`      | Defensive branches: driver-error re-throw, transfer authority re-derivation, `setMemberRole` validation                 |

## Environment Variables

| Variable               | Default              | Purpose                              |
| ---------------------- | -------------------- | ------------------------------------ |
| `DATABASE_URL`         | (required)           | Postgres connection string (app)     |
| `TEST_DATABASE_URL`    | (required for tests) | Postgres connection string (test DB) |
| `PG_MAX_CONNECTIONS`   | `20`                 | Connection pool size                 |
| `PG_IDLE_TIMEOUT`      | `20`                 | Idle-connection close timeout (s)    |
| `PG_CONNECT_TIMEOUT`   | `10`                 | Connection timeout (s)               |
| `MOCK_PLAN_SEATS`      | `3`                  | Seat limit for MockBilling           |
| `AUTH_FAILED_ATTEMPTS` | `5`                  | Failed attempts per window           |
| `AUTH_WINDOW_MS`       | `900000`             | Sliding window (15 min)              |

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

### Adding a self-service (account-level) surface

Do **not** accept a `userId` parameter. Take the session token or read `locals.user`,
and scope the SQL by `sessions.user_id` as well — the two checks are independent on
purpose, so a logic slip in one cannot widen the blast radius. See
`src/routes/app/sessions/+page.server.ts`.

### Modifying the schema

1. Edit `src/lib/server/db/schema.ts`
2. Run `npm run db:generate` to create migration SQL
3. Review the generated SQL in `drizzle/`
4. Migrations apply automatically at boot (and via `npm run db:migrate`)

## Build & CI

- **Quality gates:** clean-room install of the built artifact (the clean-room artifact gate, release Step 0b — unzip to an empty dir, install with no cache, start the Postgres 16 test container, run the suite) + `npm test` + ≥95% line/branch/function/statement coverage enforced by `vitest.config.ts`. **No CI service is included** — `.github/workflows/` is stripped from the public proof layer by design.
- **Build:** `npm run build` (adapter-auto; pin a platform adapter for production)
- **Tests require a reachable Postgres** (service container in CI, docker-compose locally)
