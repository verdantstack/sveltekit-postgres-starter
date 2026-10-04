# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.13] - 2026-10-04

## [0.1.12] - 2026-10-04

## [0.1.11] - 2026-10-02

### Fixed

- README version claim. The `**Version**` line, the version badge and the
  machine-readable `version:` field all still read `0.1.10`'s predecessor after the
  previous release, so the published proof repo stated a version that did not match
  its own release tag. All three forms now track `package.json`.


## [0.1.10] - 2026-10-02

### Added

- `src/lib/server/mcp/` — an MCP server exposing the service layer to a coding
  agent over stdio. Four read tools: `list_orgs`, `list_members`,
  `list_pending_invites` and `list_audit_log`, all backed by the same services
  the app uses, all taking a `Db` (postgres.js + Drizzle).

  - **Read-only by design.** These tools are called by a language model, and a
    model can be steered into calling them by text it has just read — a prompt
    injection hidden in an audit-log string could otherwise reach a mutating
    call. Reads cannot destroy state, so reads are the first surface exposed.
  - **No SDK.** MCP over stdio is JSON-RPC 2.0. Implementing it keeps this
    feature dependency-free and shows the protocol rather than hiding it.
  - **Both protocol shapes.** The 2026-07-28 revision dropped the mandatory
    `initialize` handshake for a stateless core carrying `protocolVersion` in
    `_meta`; older clients still open with `initialize`. The server accepts
    both and names the versions it implements when asked for one it does not.
  - **Tool failures are results, not protocol errors** (`isError: true` with a
    readable message), so a model can correct its call and retry.
  - `npm run mcp` starts it. Credentials come from whatever the app already
    uses — no new environment variables.
  - Lives inside `src/lib/server/`, so it counts toward the coverage
    threshold. The module is at 100% statement, branch, function and line
    coverage; `cli.ts` is excluded with the reason recorded in
    `vitest.config.ts`, and the transport is covered in-process.
  - The stdio transport is serialised deliberately: replies go out in the
    order requests were read, so a client never gets two responses swapped.

- `tests/mcp.test.ts` — protocol, tool and transport coverage. Test count
  294 → 325.



## [0.1.9] - 2026-10-02

### Fixed

- **The boot-time migration race is closed with a Postgres advisory lock.** `openDb()` and
  `scripts/migrate.ts` now take `pg_advisory_lock(8240173)` around the migrator, so replicas booting
  at the same moment serialise instead of both deciding the same migration is pending and one
  failing on `already exists`.
  - The key is a single exported constant, `MIGRATION_LOCK_KEY`, imported by both paths. Two
    separate keys would not exclude each other, leaving the CLI and a booting replica free to run
    at once — the exact race the lock exists to close.
  - The lock is held on a **dedicated connection**, not one drawn from the main pool. Reserving from
    the pool would hand back its only connection under `max: 1` (the test configuration) and the
    migration would wait forever for a connection that is itself holding the lock.
  - The DDL runs on the pooled client while the lock is held on its own connection. An advisory
    lock is a mutual-exclusion gate between migrators, not a per-connection guard on the
    statements, so this closes the window without tying the DDL to the lock session.
  - This is not redundant with the migrator's own transaction. Drizzle's `migrate()` does wrap each
    run in `session.transaction(...)`, which is what makes an interrupted run roll back cleanly —
    but two _concurrent_ runs both read the applied-migrations table before either commits, and the
    transaction does not help there.
  - `src/lib/server/db/index.ts` — `MIGRATION_LOCK_KEY` + `migrateUnderLock()`; the `@remarks` on
    `openDb()` no longer says migrations are unsafe under multiple replicas, because that is no
    longer true.
  - `scripts/migrate.ts` — takes the same key, so `npm run db:migrate` excludes a booting replica.

### Tests

- **273 tests, coverage 98.58% statements / 95.53% branches / 98.57% functions / 99.61% lines.**
  Two new suites, run against a live Postgres:
  - `tests/migration-lock.test.ts` — asserts a second connection genuinely cannot take the lock
    while the first holds it, and that release hands the lock over. A test that cannot fail proves
    nothing, so the blocking is measured, not assumed.
  - `tests/migration-lock-control.test.ts` — negative control: a _different_ key is not blocked by
    ours. This is what makes the assertion above meaningful, since it separates "the lock blocked
    it" from "the connection was merely busy".

### Credit

- The advisory-lock suggestion came from a reader comment on the dev.to boot-migrations post.

## [0.1.7] - 2026-09-27

### Docs

- **The boot-time migrator's concurrency limit is now documented.** `openDb()` runs the Drizzle migrator on every connection open, which is safe for local dev, a single instance, or a preview deploy — but several instances booting concurrently against the same Postgres database can each decide the same migrations are pending and race, producing `column already exists` or a partially applied migration. This was nowhere stated, so buyers running 2+ replicas would have hit it undocumented.
  - `src/lib/server/db/index.ts` — a `@remarks` block on `openDb()` next to the `migrate()` call: the boot call is a safety net, and under multiple replicas you keep `npm run db:migrate` as the only writer and treat the boot call as a no-op.
  - `docs/deployment.md` §3 — a warning subsection with a deployment table (what to do per deployment shape) and the reason both mechanisms exist: the explicit pre-deploy step is the reviewed, ordered event; the boot-time call is the guarantee that no instance serves traffic against an unmigrated schema.

### Tests

- Unchanged: 262 tests, coverage 98.57% statements / 95.53% branches / 98.55% functions / 99.61% lines. No code behavior changed in this release.

## [0.1.6] - 2026-09-25

### Fixed

- **Seat limits can no longer be oversold by concurrent invite acceptance.** `acceptInvite()` now runs the whole flow — per-org `SELECT … FOR UPDATE` row lock → seat check → single-use claim → membership insert → audit write — inside one `db.transaction()`. Previously the seat count was read outside any transaction, so two different invites accepted at the same instant could both observe "one seat free" and both commit a membership. Concurrent accepts for one org now serialize on the organization row; the conditional `UPDATE … WHERE accepted_at_ms IS NULL … RETURNING` claim remains the authoritative single-use gate. No `40001` retry loop is needed because the lock is always the transaction's first statement, so accepts queue instead of deadlocking.
- Concurrent acceptance of two _different_ invites by the same user now returns the domain error `already_member` (Postgres `23505` on `memberships_org_user_uq` is translated) instead of a 500, and the losing invite is left unclaimed by the rollback so it still works later.
- Any failure inside the transaction (e.g. a foreign-key violation on the membership insert) now rolls back the invite claim — the link stays open instead of being burned.

### Added

- `Tx` type export (`Parameters<Parameters<Db['transaction']>[0]>[0]`); `audit()`, `countActiveSeats()`, and `assertSeatAvailable()` accept `Db | Tx` so they can participate in a caller's transaction.
- 3 concurrency tests against a real Postgres (`tests/edge-cases.test.ts`): last-seat race (exactly one winner, loser gets `seat_limit`, invite unclaimed), duplicate-member race (`already_member`, losing invite unclaimed), and FK-violation rollback (claim unwinds). Suite total: 262 tests; coverage 98.57% statements / 95.53% branches / 98.55% functions / 99.61% lines.

### Docs

- `docs/architecture.md` concurrency notes rewritten: the old "claim+count could be wrapped in one transaction" limit is gone; the new limits (external billing call inside the lock; Postgres-only — D1 `batch()` and PostgREST have no interactive transactions) are documented instead.
- README/AGENTS.md/docs/testing.md updated to v0.1.6 · 262 tests; TypeDoc reference regenerated (`audit` signature, new `Tx` alias). Screenshot S6 still shows the pre-0.1.6 run and is regenerated by the standing screenshot pipeline at release.

## [0.1.5] - 2026-09-20

### Added

- **Dinh Fire Lamp theme** applied across the app UI and docs — Bạc Ngà (ivory) light default with an optional Rừng Đêm (forest-night) dark palette, tokenized per the shared design spec (Georgia serif headings, 18px radii, 60-30-10).

### Fixed

- Light-mode `--faint` text color corrected to the spec value (`#97897a`; a dark-mode value had been used, dimming secondary text too far in light mode).

### Docs

- Screenshot gallery refreshed — every capture re-taken against the themed live demo (org dashboard, RBAC denial GIF, audit; 259 tests).

## [0.1.4] - 2026-09-13

### Docs

- Suite tables completed to match the shipped 13 test files: `AGENTS.md`, `docs/testing.md`, and README status now list every suite (added `billing-edge-cases`, `rbac-boundary`, `service-integration`, `edge-cases`) with per-file coverage notes (259 tests total).

## [0.1.3] - 2026-09-10

### Tests

- 259 tests (was 206): +53 new tests against a real Postgres test database covering e2e billing flows (seat upgrades/downgrades, adapter failures, boundary conditions), RBAC boundary cases (cross-org isolation, rank escalation, hierarchy enforcement), full multi-step service-integration flows, and auth edge cases.

## [0.1.2] - 2026-09-09

### Added

- **Usage-based billing guide**: `docs/ai-billing.md` — adapter pattern for AI token usage tracking, metered billing, and usage-based pricing.
- **`.dockerignore`**: Build context exclusions for cleaner Docker builds.

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

[0.1.13]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.12...v0.1.13
[0.1.12]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.12...v0.1.12
[0.1.11]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.10...v0.1.12
[0.1.10]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.9...v0.1.9
[0.1.9]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.7...v0.1.9
[0.1.5]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.1...v0.1.2
[0.1.0]: https://github.com/verdantstack/sveltekit-postgres-starter/releases/tag/v0.1.0
