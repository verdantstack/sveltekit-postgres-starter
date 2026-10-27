# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.18] - 2026-10-27

## [0.1.17] - 2026-10-27

### Changed
- Version bump to 0.1.17.

### Added
- Service-layer parity: sessions, password reset, email verification, files,
  webhooks, notifications, API keys, audit retention, impersonation, blog,
  affiliates, usage billing, waitlist, MFA, and OAuth now ship across all three
  kits.
- `/signup` route, delegating to a single shared implementation.

### Fixed
- Postgres RLS: policies applied as BYPASSRLS, not as table owner (was causing
  infinite recursion).
- Migration 0011 denies the Supabase Data API; application unaffected.
- Seat-count decision site consolidated to one location.
- Real concurrency guard added to seat-limit enforcement.
- Export parity across kits.


## [0.1.16] - 2026-10-16

### Fixed

- **🔴 `HOW TO APPLY` told buyers to apply the RLS file as the table owner, which
  could not work.** The 0.1.15 fix made the three `SECURITY DEFINER` helpers
  correct, and correctly explained that a `SECURITY DEFINER` function only
  breaks the policy recursion if the role owning it is exempt from RLS. But it
  named the wrong exempt role as the remedy: this same file runs
  `ALTER TABLE ... FORCE ROW LEVEL SECURITY` on all four tables, and `FORCE`
  removes precisely the exemption a table owner holds by ownership. Following
  the instruction as a plain table owner therefore reproduced the very failure
  the file warns about — `ERROR: stack depth limit exceeded` on the first
  request that sets the GUC.

  Measured on PostgreSQL 16 to confirm rather than assume — same table, same
  owner, one row, a `USING (false)` policy, owner with `rolsuper = false` and
  `rolbypassrls = false`:

  | State | Owner `SELECT count(*)` |
  |---|---:|
  | `ENABLE ROW LEVEL SECURITY` only | **1** — owner bypasses RLS |
  | `ENABLE` + `FORCE` | **0** — owner is subject to the policy |

  `HOW TO APPLY` now asks for a role with `BYPASSRLS` (or a superuser), the
  only exemptions that survive `FORCE`, and says explicitly that ownership is
  not enough. `docs/deployment.md` is corrected to match.

  **This corrects an instruction introduced in 0.1.15; the 0.1.15 entry above is
  left as the historical record of what that release said.**

### Added

- **Regression coverage for the instruction itself** in `tests/rls-isolation.test.ts`
  (3 tests). The existing isolation suite could not catch this: it connects as a
  deliberate non-superuser non-owner role, which is right for testing the
  policies and is exactly why nothing ever exercised the owner path. The new
  checks assert that this file `FORCE`s RLS, that its apply instructions ask for
  `BYPASSRLS` and never rely on the owner, and that the three helpers are owned
  by a role exempt from RLS.

  Verified to fail on the defect before being verified to pass.

### Changed

- Test count 451 -> 454.


## [0.1.15] - 2026-10-14

### Fixed

- **🔴 The RLS policies could not execute. Infinite policy recursion.**
  `memberships_select` is gated by `app_is_org_member(org_id)`, and
  `app_is_org_member` reads the `memberships` table. As shipped, the helper was a
  plain `SECURITY INVOKER` function, so evaluating the policy re-entered the
  policy. The first request that set the GUC failed with:

  ```
  ERROR:  stack depth limit exceeded
  ```

  Every tenant-scoped read errored out. The irony is exact: the feature that was
  meant to be defense-in-depth was the thing breaking the reads it was meant to
  protect — and it only ever surfaced for a buyer who actually applied the file,
  because no shipped code path, test, or demo in this kit enables RLS.

  Fixed by making the three helpers that read `memberships`
  (`app_is_org_member`, `app_org_role`, `app_has_min_role`) `SECURITY DEFINER`
  with `SET search_path = public, pg_temp`, so they run as an owner exempt from
  the policy being evaluated. The pinned `search_path` is standard companion
  hardening, not decoration: without it a `SECURITY DEFINER` function resolves
  unqualified names through the caller's `search_path`, which is itself a
  privilege-escalation path. `app_current_user()` reads only the GUC and so is
  deliberately left invoker-scoped.

  **`HOW TO APPLY` is reordered because of this.** The file must now be applied
  **as the table owner** (or a role with `BYPASSRLS`), *not* through the
  low-privilege app role. A `SECURITY DEFINER` function only escapes the
  recursion if the role that owns it is exempt from RLS; applying the file as
  the app role leaves the helpers owned by a role that is subject to the very
  policies they evaluate, and `stack depth limit exceeded` returns.

- **🔴 The documented way to set the GUC was SQL Postgres rejects.** All three
  copies of the wiring example shipped
  `SET LOCAL app.current_user_id = ${...}`. `SET` and `SET LOCAL` are utility
  commands, not functions, so they accept **no bind parameters** — a driver
  binding the user id into them gets a syntax error, not a session. The
  parameterized form is `set_config('app.current_user_id', $1, true)`. Corrected
  in `rls/0010_rls_policies.sql`, `docs/architecture.md` and
  `docs/deployment.md`.

- **🔴 The docs omitted the pooling hazard that makes the scope argument
  load-bearing.** A session-scoped value survives a connection going back to the
  pool, so the next request drawing that backend can inherit the *previous*
  tenant's identity — a cross-tenant leak that is invisible with one connection
  and rare under light load. `docs/deployment.md` now documents the three rules
  that close it (transaction scoping, `RESET ALL` / `DISCARD ALL` on release,
  never session-scoping under a pool) and the `SET LOCAL`-outside-a-transaction
  no-op that surfaces as "the list is mysteriously empty".

  `tests/pool-options.test.ts` already documented this exact hazard for
  `SET search_path` — a session setting that leaks across a pool. The awareness
  existed; it had never reached the RLS docs, which is where it mattered.

### Added

- **`tests/rls-isolation.test.ts` — the two-account isolation check, 11 tests.** RLS is
  opt-in, so nothing in the kit exercised it at runtime; the documentation was
  the only thing a buyer had to trust. This suite runs the shipped
  `rls/0010_rls_policies.sql` against a live Postgres as a genuine non-superuser,
  non-owner role (`TEST_DATABASE_URL` connects as a superuser, which bypasses RLS
  unconditionally and would have made every check vacuous).

  It asserts: the check role is not a superuser and owns nothing; isolation holds
  across the **open-transaction window** with account A's transaction
  deliberately held open; A's data is invisible to B across all four gated
  tables; the policies are fail-closed; and — the part that makes the rest
  falsifiable — **the session-scoped form does leak** on a reused pooled backend
  while the transaction-scoped form does not, on the same pool shape, in the same
  order. Without that last pair, a check that set nothing at all would also
  "pass".

- Test suite: **440 → 451 tests across 27 files**, against the real Postgres test
  database. Coverage unchanged at 100% statements / 99.26% branches / 100%
  functions / 100% lines.

### Not changed

- **The SvelteKit + Supabase sibling kit is unaffected, and was checked rather than
  assumed.** Its RLS is entirely `auth.uid()` — 13 policy references, zero
  `current_setting` or `set_config` — so no custom GUC is ever set and PostgREST
  owns the per-request scope. The pooling hazard above does not apply to it.

## [0.1.14] - 2026-10-12

### Fixed

- **`createOrg` is now atomic.** It wrote three rows — the organization, the owner
  membership and the audit entry — with no transaction around them. A failure
  between any two leaves an organization that exists but belongs to nobody: no
  membership means `getOrgForUser()` returns `null` for every user, so it is
  invisible in the UI, undeletable through the app, and — because the audit log is
  append-only — uncollectable forever. No rare fault is needed to hit this; a
  process that ends between two `await`s is enough. All three writes now run in one
  `db.transaction`. postgres.js is async-native, so an async callback is the
  normal shape and the awaits genuinely stay inside the transaction; the
  `better-sqlite3` caveat that an `await` inside the callback can let the driver
  COMMIT early does not apply here. `tests/org-atomicity.test.ts` induces a real
  failure between the statements — a syntactically valid, non-existent `userId`,
  which commits the org row and then fails the membership FK — and asserts no
  orphan row, no membership and no audit entry survive. Reverting the transaction
  makes it fail.
  - The slug-collision retry moved to `ON CONFLICT DO NOTHING`, because a
    try/catch retry loop **cannot** work inside a transaction: Postgres aborts the
    whole transaction on any failed statement, so every statement after the first
    unique violation would fail with "current transaction is aborted". A collision
    now returns zero rows instead of raising, which keeps the transaction usable.
- **The test suite no longer corrupts itself when two suites share its database.**
  `createTestDb()` truncates six tracked tables before every test, and
  `fileParallelism: false` serialises files only _within one vitest process_ — it
  does nothing about a second one. A second `npm test` (another terminal, a CI
  matrix shard, two checkouts on a laptop) interleaved its truncations with the
  first, and the result read exactly like a broken schema. Measured on this kit
  before the fix: two concurrent runs produced 28 failures and 19
  `memberships_user_id_users_id_fk` violations, with nothing in the output
  mentioning concurrency. A real FK defect is deterministic; a pile of them whose
  count moves with interleaving is not.
  `tests/helpers/test-db-guard.ts` now takes a **session-scoped** advisory lock
  (`TEST_DB_LOCK_KEY`) on a **reserved** connection for the whole run, acquired in
  `globalSetup` and released in teardown. Reserved because `pg_advisory_lock`
  belongs to the physical session, not to the JS client: taken on a pooled
  connection and returned, it either leaks and blocks every later run forever, or
  is dropped mid-suite when the pool hands that session to someone else. A
  try-lock rather than a blocking lock, because the blocking form would park the
  second run silently for the length of the first and look like a hung suite. A
  concurrent run now aborts **before any test is collected**, with one sentence:
  > another test suite is using this database — wait for it to finish, or point
  > TEST_DATABASE_URL somewhere else.
  > `TEST_DB_LOCK_KEY` is deliberately neither `MIGRATION_LOCK_KEY` nor
  > `MIGRATION_LOCK_KEY ± 1`: reusing the migration key would make a test run and a
  > `db:migrate` exclude each other with an error that names neither, and the ±1
  > case collides with `tests/migration-lock-control.test.ts`, which takes
  > `MIGRATION_LOCK_KEY + 1` as its negative control — that suite blocks on the key
  > and times out. `tests/test-db-guard.test.ts` pins both constraints and asserts
  > the lock is genuinely held, by a session other than the test's own.

### Changed

- Test suite: **422 → 440 tests across 26 files**, against the real Postgres test
  container.
- `npm test` now requires exclusive use of `TEST_DATABASE_URL`; a concurrent run
  fails fast rather than producing misleading failures. Documented in `README.md`,
  `AGENTS.md` and `docs/testing.md`.

### Added

- **Audit-log export** — `countAudit()`, `exportAuditCsv()` and `exportAuditJson()`
  in `src/lib/server/db/audit.ts`, closing the gap with the SQLite sibling kit.
  All three accept `Db | Tx` so an export can join a caller's transaction. CSV
  values containing a comma, quote or newline round-trip byte-for-byte through any
  RFC 4180 parser, and any value a spreadsheet would evaluate as a **formula**
  (leading `=`, `+`, `-`, `@`, tab or CR) is prefixed with an apostrophe first —
  invite metadata carries an inviter-supplied email address, so that content is
  attacker-influenceable. `limit`/`offset` are clamped
  (`clampExportPage`, `MAX_EXPORT_ROWS = 10_000`) so a request parameter cannot ask
  Postgres for the whole append-only log. JSON export parses metadata back into
  real objects and degrades an unparseable row to its raw string rather than
  aborting the export.
- **`POST /app/org/[id]/audit/export`** — the export as a user-reachable action on
  the org's Audit tab, admin/owner only via `audit.view`. It is **POST, not GET**,
  because the export writes an `audit.exported` row recording who pulled the log
  and when — an export missing from the log is exactly the gap this closes. POST
  keeps it behind SvelteKit's `csrf.checkOrigin`; the response is `no-store`.
- **`/app/sessions`** — see every active session for your account, revoke one, or
  sign out everywhere else. The acting user id is derived from the httpOnly session
  cookie server-side and is never read from the form; the `DELETE` is additionally
  scoped by `sessions.user_id`, so a crafted POST reaches no other account.
  Revocations write `session.revoked` / `session.revoked_all` audit rows (with a
  null `org_id`, since they belong to the account, not to one organization).
- `cleanupExpiredSessions(db)` — prunes expired session rows and returns the count.
  `getUserBySessionToken()` treats an expired session as unauthenticated but leaves
  the row, so without a sweeper the `sessions` table grows without bound.
- `poolOptionsFromEnv()` and the `idleTimeout`/`connectTimeout` options on
  `openDb()`.

### Security

- **scrypt work factor raised to N = 2^17, r = 8, p = 1.** The previous N = 2^14,
  p = 1 was described in the source as "OWASP-recommended" while being a pairing
  OWASP's Password Storage Cheat Sheet does not list — its five configurations of
  "similar minimal level of defense" are N=2^17/p=1, 2^16/p=2, 2^15/p=3, 2^14/p=5
  and 2^13/p=10. The comment now names a configuration the standard actually
  specifies. Because `format()` encodes the parameters inside the hash and
  `verifyPassword()` reads them back out, **existing password hashes keep working**
  and are upgraded at each user's next sign-in; `tests/auth.test.ts` pins that path.
  `maxmem` is now set explicitly (256 MiB): Node defaults it to 32 MiB, and at
  N = 2^17 scrypt needs 128 MiB, so without it every login would fail with
  `error:030000AC`. The parameters are deliberately not env-configurable — a work
  factor is not a performance dial.
- **The single-owner invariant is now enforced under concurrency.** `leaveOrg()` and
  `transferOwnership()` read the owner count and then write in two separate round
  trips. Two owners of the same org leaving at the same instant both read
  "another owner exists", both proceed, and the organization is left with **no
  owner** — a state no RBAC path can recover from, because every path keys off an
  owner. On SQLite the whole process is serialized behind one mutex so the window
  does not exist; on a Postgres pool it is an ordinary race. Both now run inside a
  transaction whose first statement is `SELECT … FOR UPDATE` on the organization
  row — the same gate `acceptInvite()` already used. `transferOwnership()`
  additionally re-reads the actor's live role inside that transaction instead of
  trusting the caller-supplied `actorRole`: without it, a second transfer launched
  in the same instant still passes `ownership.transfer` on a stale role and
  manufactures the two-owner inconsistency the function exists to reject.
  `tests/members-concurrency.test.ts` starts two genuinely simultaneous operations
  and asserts on the committed result.
- `listSessions()` and `listMembers()` now have a deterministic `ORDER BY`. Postgres
  makes no ordering guarantee without one, so both were free to reorder themselves
  between two identical requests. `createdAtMs` alone is not sufficient — two
  members who accept invites in the same millisecond would still swap — so the
  membership id breaks the tie. The missing `ORDER BY` on `listSessions` was also a
  divergence from the SQLite sibling, where rowid order happened to hide it.

### Fixed

- `PG_IDLE_TIMEOUT` and `PG_CONNECT_TIMEOUT` are documented in `README.md`,
  `AGENTS.md`, `.env.example` and `docs/deployment.md` but were **never read by any
  line of code** — the driver was constructed with `max` alone. An operator tuning
  them for a constrained instance watched the settings sit in `.env` doing nothing.
  Both now reach postgres.js.
- `openDb(url, { schema })` documents that it requires `max: 1` — `SET search_path`
  is a session setting, and on a pool of N connections it lands on whichever
  connection served it while later queries may draw a different one — but nothing
  enforced it, so a schema-scoped handle silently leaked into `public`. The pool is
  now pinned to 1 whenever a schema is requested.
- `createOrg()` used a 3-byte (24-bit) random slug suffix with no collision
  handling, so a clash on the `organizations_slug_uq` unique index escaped as a raw
  driver error with no machine code — `errorToFail()` cannot classify it, so a
  retryable naming collision surfaced to the user as an HTTP 500. The suffix is now
  4 bytes (32 bits) and the insert is retried on SQLSTATE 23505 only, up to five
  times, falling back to a typed `OrgError('not_found')`. Every other error
  propagates on the first attempt: a retry loop that swallowed a connection failure
  would turn a real outage into a mysterious hang.

### Changed

- Test suite: **325 → 422 tests across 24 files**, against the real Postgres test
  container.
- Coverage: **100% statements / 99.26% branches / 100% functions / 100% lines**
  (was 99.44 / 98.34 / 100 / 99.69). The ≥ 95% floor is unchanged and still
  enforced in `vitest.config.ts`. The two branches still open are the
  `org?.name ?? ''` fallbacks in `peekInvite()`/`acceptInvite()`: an invite cannot
  outlive its organization (the FK is `ON DELETE CASCADE`), so they are reachable
  only under the opt-in RLS policies, where `organizations` SELECT is gated by
  membership and an anonymous invitee legitimately sees no row.
- `npm test` now takes roughly 3–4 minutes instead of ~1: the suite runs real scrypt
  at the OWASP work factor (128 MiB and ~0.55 s per hash) as well as real Postgres.
  Documented in `README.md` and `docs/testing.md` rather than papered over.
- The slug suffix is 8 hex characters, not 6 — `tests/orgs-members.test.ts` pinned
  the old width and is updated with it.

### Documentation

- Reconciled with measured state: test counts, coverage figures, the new export and
  session surfaces, the scrypt parameters, and the fact that `PG_IDLE_TIMEOUT` /
  `PG_CONNECT_TIMEOUT` are now actually wired.
- `README.md` now states explicitly that **no migration in `drizzle/` applies
  `rls/0010_rls_policies.sql`** — until a buyer runs the documented `psql` command
  the app is protected by the service layer alone, which is a supported and tested
  configuration. The RLS claim was already consistently "opt-in" everywhere else
  (`README.md`, `AGENTS.md`, `docs/architecture.md`, `docs/deployment.md`); this
  closes the last ambiguity rather than correcting an overstatement.
- The screenshot caption claiming a "current 325-test mark" is now labelled as a
  historical capture.

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

[0.1.18]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.17...v0.1.18
[0.1.16]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.15...v0.1.16
[0.1.15]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.14...v0.1.15
[0.1.14]: https://github.com/verdantstack/sveltekit-postgres-starter/compare/v0.1.13...v0.1.14
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
