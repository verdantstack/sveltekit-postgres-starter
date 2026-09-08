# CLAUDE.md — Claude AI Context

> Context for Claude when working on this codebase.

## What This Is

A production-shaped B2B SaaS foundation for SvelteKit + Postgres. Not a tutorial, not a boilerplate — a working implementation of multi-tenancy, RBAC, seat billing, and audit logging on real Postgres (Drizzle ORM + postgres.js), with **206 tests** running against a live Postgres test database.

## The Mental Model

Think of this as three layers:

1. **Routes** (thin) — parse forms, call services, handle errors
2. **Services** (domain logic) — pure functions that accept a `Db` and do real work
3. **Infrastructure** (db, auth, rbac, billing) — pluggable seams, not monoliths

The key insight: **services never import from SvelteKit and never open a database connection** — they take a `Db`. That makes them testable against Postgres and portable to any framework (the same service layer also runs on SQLite in the Multi-tenant SvelteKit Starter).

## Database Particulars

- **Driver:** postgres.js — asynchronous, connection-pooled. `getDb()` returns a memoized handle bound to `DATABASE_URL`; never call it from tests.
- **Migrations:** checked in under `drizzle/`; applied automatically at boot in `createDb()`/`openDb()`, and on demand via `npm run db:migrate`. After editing `src/lib/server/db/schema.ts`, run `npm run db:generate` and review the generated SQL.
- **Types:** `uuid` PKs (app-supplied UUIDv4), Unix epoch **milliseconds** as `bigint` (`mode: 'number'`), metadata as JSON text. The `bigint`-ms choice is deliberate — it keeps the service layer identical to the SQLite starter.
- **RLS is opt-in:** tenancy is enforced in the service layer. `rls/0010_rls_policies.sql` enables database-level defense-in-depth but requires the `app.current_user_id` GUC pattern (docs/deployment.md). Don't add RLS to the base migration.

## When Modifying Code

### If you're changing behavior
1. Write the test first (or alongside)
2. Service layer is where logic lives — not in routes
3. Every write must go through `requirePermission()` + `requireRole()`
4. Every write must produce an audit entry in the same call

### If you're changing the schema
1. Edit `src/lib/server/db/schema.ts`
2. Run `npm run db:generate`
3. Review the generated SQL in `drizzle/`
4. Test that migrations apply cleanly (`npm run db:migrate`, then `npm test`)

### If you're adding a new feature
1. Check `rbac.ts` — does it need a new permission?
2. Create service in `src/lib/server/services/`
3. Wire the route in `src/routes/`
4. Add to `errorToFail()` if new error types
5. Test the full flow HTTP-level in `tests/http.test.ts`

## Things That Will Bite You

- **Redirect swallowing:** `errorToFail()` must rethrow SvelteKit redirects, not swallow them. If you see a 500 after a successful action, check this.
- **RBAC hierarchy:** `mayActOn(actor, target)` requires `rank(actor) > rank(target)`. An admin cannot touch another admin. This is by design.
- **Last owner:** The code prevents the last owner from leaving or being removed. Don't remove this check.
- **Invite race conditions:** Single-use invites use conditional UPDATE, not read-then-write. Two concurrent clicks = exactly one winner. Don't "fix" this with transactions.
- **Audit is append-only:** There is no UPDATE or DELETE path for audit_log. Don't add one.
- **Async driver:** everything database-related is `await`ed (unlike the SQLite starter's synchronous driver). Missing `await` on a `getDb()` is a common slip.
- **Test DB identity:** tests use `createTestDb()` (shared test DB, truncated per test). Never let tests touch `getDb()` (the `DATABASE_URL` singleton) or you'll wipe/contaminate dev data.

## Testing Philosophy

- Tests use a **real Postgres** at `TEST_DATABASE_URL` (docker-compose's `test-db` on :5434), not an in-memory stand-in.
- `createTestDb()` applies migrations once and truncates the tracked tables per test — fast, isolated, no side effects.
- Test files run sequentially (`fileParallelism: false`) so the shared test database is never contended.
- Tests exercise services directly AND HTTP-level flows.
- The HTTP tests in `tests/http.test.ts` are the most important — they prove the full stack works.

## Code Conventions

- TypeScript strict mode
- Error classes: `AuthError`, `RbacError`, `InviteError`, `MemberError`, `OrgError`, `BillingError`
- Timestamps: milliseconds, UTC
- Database: postgres.js (async, pooled), Drizzle ORM
- Local dev needs Docker (`docker compose up -d`) or any reachable Postgres