# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-09-08

### Added
- **Password strength validation**: `checkPasswordStrength()` enforces uppercase, lowercase, and digit requirements (not just minimum length). Returns `{ ok, reasons }` for UI feedback.
- **Session management**: `listSessions()`, `destroyAllSessions(exceptToken?)` for security features like "log out everywhere".
- **Billing guard**: `assertSeatAvailable()` now blocks `past_due` and `canceled` subscriptions from adding new seats.

### Fixed
- **`createUser` error handling**: catch block now handles `DrizzleQueryError.cause.code` for Postgres unique constraint violations (`23505`) instead of silently swallowing all DB errors as `email_taken`.

### Tests
- 206 tests (was 194): +12 new tests covering billing guard (past_due/canceled/active/trialing), audit pagination (offset, limit=0, ordering), and error mapping with actual Error subclasses.

### Planned
- Real merchant-of-record billing adapter (Lemon Squeezy / Paddle) behind the existing `BillingAdapter` seam
- JSONB metadata columns on audit_log / memberships (upgrade path documented in `docs/deployment.md`)
- GIN full-text search over the audit log (tsvector, documented in `docs/deployment.md`)
- Drizzle read/write split configuration for read replicas (documented in `docs/deployment.md`)

## [0.1.0] - 2026-08-31

### Added
- **Authentication**: Email+password with scrypt hashing, DB-backed revocable sessions, hashed session tokens (raw token never persisted)
- **Rate limiting**: Sliding-window failed-attempt limiter on login/signup — `RateLimiter` seam, `AUTH_FAILED_ATTEMPTS`/`AUTH_WINDOW_MS` env, 429 with approximate retry window, cheap pre-check before scrypt
- **Organizations**: Create, unique URL-safe slug, owner bootstrap, member-only reads
- **Invites**: Single-use hashed tokens, 7-day expiry, revoke, atomic conditional-UPDATE claim, optional recipient-email note
- **RBAC**: `owner > admin > member` hierarchy with capability matrix, enforced server-side on every load/action; hierarchy rules (act downward, grant strictly below, no self-modification, single-owner invariant)
- **Billing**: `BillingAdapter` interface + deterministic `MockBillingAdapter` (seat limits enforced at join time via `assertSeatAvailable`)
- **Audit log**: Append-only by construction — no UPDATE/DELETE path exists anywhere
- **Postgres port**: Drizzle Postgres schema (`uuid` primary keys, bigint epoch-ms timestamps, Postgres indexes) with the `postgres.js` driver; service layer untouched from the SQLite starter (swap the driver, keep the services)
- **Migrations**: Checked-in Drizzle SQL migration (`drizzle/0000_init.sql`), applied automatically at boot via `migrate()`; `npm run db:migrate` for on-demand application
- **Connection pooling**: Pool sized by `PG_MAX_CONNECTIONS`; PgBouncer/Supavisor guidance in `docs/deployment.md`
- **RLS (opt-in)**: `rls/0010_rls_policies.sql` — Row-Level Security policies for all tenant tables with `FORCE RLS`, per-request `app.current_user_id` GUC pattern, documented as fail-closed defense-in-depth
- **Local Postgres**: `docker-compose.yml` with Postgres 16 (dev :5433 + test :5434 databases)
- **Testing**: 194 tests across 9 suites against a real Postgres test database (per-worker isolated schema + per-test truncation), `fileParallelism: false`
- **Documentation**: Architecture, RBAC, billing, testing, deployment (providers, pooling, RLS, optional upgrades), versioning
- **Repository hygiene**: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `.github` templates (CI with Postgres 16 service container, release pipeline), EULA (`LICENSE`)

### Design Principles
- Server-side enforcement everywhere (UI hides controls, but every load/action re-checks)
- Services are framework-free (import nothing from `@sveltejs/kit`)
- Every mutating service call re-derives authority
- Errors carry machine codes (`AuthError`, `RbacError`, etc.); one error mapper (`errorToFail()`)
- No ORM lock-in at service boundaries — same service layer runs on SQLite or Postgres
- Tenancy enforced in the app layer by default; RLS shipped as opt-in hardening

[0.1.0]: https://github.com/verdantstack/sveltekit-postgres-starter/releases/tag/v0.1.0