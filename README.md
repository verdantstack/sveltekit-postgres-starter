<p align="center">
  <img src="https://verdantstack.dev/logo%20wordmark.svg" alt="VerdantStack" width="400">
</p>

<h3 align="center">SvelteKit + Postgres Starter</h3>

<p align="center">
  A B2B SaaS foundation for <strong>SvelteKit + Postgres</strong> with multi-tenancy wired end to end.
</p>

<p align="center">
  organizations & membership · invite links · role-based access control · seat-based billing · append-only audit log (CSV/JSON export) · session management · failed-login rate limiting · Postgres RLS (opt-in) · connection pooling · tested where it hurts.
</p>

<p align="center">
  <a href="https://verdantstack.dev/products/sveltekit-postgres-starter/">Documentation & guides →</a>
</p>

---

> ## 🔒 Get the full source
>
> This repository showcases the **SvelteKit + Postgres Starter**: the feature
> list and architecture docs below. The complete production source code (auth,
> RBAC, seat billing, audit log, rate limiting, Postgres Drizzle schema, RLS
> policies — **454 tests**) is included with your purchase under the
> [End User License Agreement](https://verdantstack.dev/docs/license/):
> license · 30-day refund · **lifetime updates + lifetime standard support**.
>
> Questions? [verdantstack@proton.me](mailto:verdantstack@proton.me)

---

<!-- Metadata for AI agents and tooling -->
<!--
project_name: sveltekit-postgres-starter
project_type: starter-kit
language: TypeScript
framework: SvelteKit
database: PostgreSQL (Drizzle ORM + postgres.js, any provider)
auth: custom (scrypt + hashed sessions)
testing: Vitest
test_count: 454
license: Proprietary
version: v0.1.16
status: active
changelog: https://github.com/verdantstack/sveltekit-postgres-starter/blob/main/CHANGELOG.md
releases: https://github.com/verdantstack/sveltekit-postgres-starter/releases
website: https://verdantstack.dev/products/sveltekit-postgres-starter/
repository: https://github.com/verdantstack/sveltekit-postgres-starter
support_email: verdantstack@proton.me
support_patreon: https://www.patreon.com/cw/VerdantStack
features:
  - multi-tenancy
  - role-based-access-control
  - seat-billing
  - audit-log
  - rate-limiting
  - hashed-sessions
  - session-management
  - audit-export
  - invite-links
  - postgres-rls
  - connection-pooling
tags: saas, starter, boilerplate, sveltekit, postgres, drizzle, multi-tenant, rbac, billing, audit, rls
-->

> ### 📄 What this repository is
>
> This is the **public proof layer**: documentation, the TypeDoc API reference,
> architecture notes, screenshots and the changelog. The runnable SvelteKit
> application is **not** here — `src/` is intentionally absent.
>
> **The source ships with your purchase.** See the
> [End User License Agreement](https://verdantstack.dev/docs/license/).
>
> **New here and want to see it run first?** Try the
> [live demo](https://postgres-starter.verdantstack-site.pages.dev/) — it is the same kit, deployed and seeded, and it resets
> daily.

## Why this exists

Building a B2B SaaS? You'll need multi-tenancy, role-based access control, invite flows, seat-based billing, and an audit log. Every SaaS needs these. Every team rebuilds them from scratch.

This starter gives you all of them — **on real Postgres, with no provider lock-in** — wired together and tested, so you can focus on your actual product.

**What's included vs. free alternatives:**

| Feature            | Free starters | This kit                                 |
| ------------------ | ------------- | ---------------------------------------- |
| Auth               | ✅            | ✅ (scrypt N=2^17 + hashed sessions)     |
| Dashboard          | ✅            | ✅                                       |
| Multi-tenancy      | ❌            | ✅ (orgs, memberships, invites)          |
| RBAC               | ❌            | ✅ (owner > admin > member)              |
| Seat billing       | ❌            | ✅ (pluggable adapter)                   |
| Audit log          | ❌            | ✅ (append-only, CSV/JSON export)        |
| Rate limiting      | ❌            | ✅ (sliding window)                      |
| Real Postgres      | ❌            | ✅ (Drizzle + postgres.js, any provider) |
| Row-level security | ❌            | ✅ (opt-in hardening, `rls/`)            |
| Connection pooling | ❌            | ✅ (pool sizing + PgBouncer guidance)    |
| Tests              | 0–10          | 454                                      |

**Same architecture as the [Multi-tenant SvelteKit Starter](https://github.com/verdantstack/multi-tenant-sveltekit-starter) — but not a driver swap.** Both kits run the same domain model: organizations → memberships → invites → RBAC → seat billing → append-only audit. What transfers between them is the shape of the solution and the vocabulary, not the code.

The honest size of that gap, measured on this tree: **23 files under `src/` are byte-identical to the SQLite sibling kit, 26 differ**, and each kit ships one file the other does not (`lib/server/services/sessions.ts` there; the audit-log CSV/JSON export endpoint here). The 26 are not incidental. SQLite serialises writes behind one process and one mutex; Postgres does not, so the concurrency work is real work rather than configuration — `SELECT … FOR UPDATE` on the org row as the first statement of every check-then-act, `ON CONFLICT DO NOTHING` for the slug-collision retry, and the three writes in `createOrg` inside a single transaction. The SQLite kit's version of those functions is correct; it is correct *because* the race cannot happen there.

If you have read the SQLite sibling kit, you will recognise the model immediately and you will not be able to change one line and run it on Postgres.

## See it in action

Real UI captured from the **live deployed demo** — [postgres-starter.verdantstack-site.pages.dev](https://postgres-starter.verdantstack-site.pages.dev/) (seeded org, resets daily; click through free, no login needed to explore):

| Organizations home — sign in, pick an org                                           | Audit log — every event recorded, append-only                                    |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![Organizations home in the live demo](docs/screenshots/live-demo-postgres-app.png) | ![Org audit log in the live demo](docs/screenshots/live-demo-postgres-audit.png) |

### Role-based access control is enforced server-side — real session, ~3s

A member's view renders no admin controls; even a hand-crafted POST to promote the owner is rejected by the app with a real HTTP 403:

![RBAC denial: member view has no admin controls; a native POST attempting to promote the owner returns the app's 403 banner](docs/screenshots/G2-rbac-denial.gif)

<details>
<summary>More screenshots (docs/screenshots)</summary>

| Screenshot                                                                                     | Caption                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ![Org dashboard: members, seats, invite controls](docs/screenshots/live-demo-postgres-org.png) | Org dashboard — members, seats, invite controls                                                                                            |
| ![Demo landing with sign-in line](docs/screenshots/live-demo-postgres-landing.png)             | Demo landing — sign-in line + buy-kit CTA                                                                                                  |
| ![Test run capture](docs/screenshots/S6-vitest-325-passed-postgres.png)                        | Verbatim `npm test` output captured at the 325-test mark (historical — the suite has since grown; re-run `npm test` for the current count) |

</details>

## Status

**Version**: v0.1.16 | Last Updated: 2026-10-14 | **License**: Proprietary

[![Changelog](https://img.shields.io/badge/changelog-CHANGELOG.md-blue)](CHANGELOG.md)
[![Version](https://img.shields.io/badge/version-v0.1.16-green)](https://github.com/verdantstack/sveltekit-postgres-starter/releases)
[![Support on Patreon](https://img.shields.io/badge/Support-Patreon-f96854?logo=patreon)](https://www.patreon.com/cw/VerdantStack)
[![AI Agent Ready](https://img.shields.io/badge/AI%20Agent-Ready-22c55e)](https://github.com/verdantstack/sveltekit-postgres-starter/blob/main/AGENTS.md)

- [x] Auth: email+password (scrypt **N=2^17, r=8, p=1** — OWASP's stated minimum for scrypt), DB-backed revocable sessions, hashed session tokens
- [x] Rate limiting: sliding-window failed-attempt limiter on login/signup (verified over HTTP)
- [x] Orgs: create, slug, owner bootstrap
- [x] Invites: single-use hashed tokens, 7-day expiry, revoke, atomic claim in one transaction (per-org row lock → seat check → claim → membership → audit)
- [x] RBAC: `owner > admin > member`, capability matrix + hierarchy rules enforced server-side
- [x] Billing: `BillingAdapter` interface + `MockBillingAdapter` (seat limits enforced at join time)
- [x] Audit log: append-only by construction (no UPDATE/DELETE path exists); export to CSV/JSON from the org's Audit tab, and every export is itself recorded as an `audit.exported` event
- [x] Session management: see and revoke your own sessions at `/app/sessions` (and "sign out everywhere"); the acting user is re-derived from the session cookie, never from a client-supplied id
- [x] Postgres: Drizzle schema (`uuid` ids, bigint-ms timestamps), checked-in migrations, pool sizing
- [x] RLS: opt-in defense-in-depth policies (`rls/0010_rls_policies.sql`)
- [x] Local dev: `docker-compose.yml` (Postgres 16, dev + test databases)
- [x] Tests: **454 passing** against a real Postgres test database
- [x] `svelte-check` clean; production build clean; flows verified over HTTP end-to-end
- [ ] Real MoR billing adapter (in progress — plugs into the same `BillingAdapter` seam)
- [ ] Read replicas / JSONB metadata / full-text search (documented add-yourself patterns in `docs/deployment.md`)

## Quick start

> The commands below run in **your purchased copy**, which contains `src/`.
> They cannot run in this public repository — there is no application here.

```bash
# 0. Prerequisites: Node.js 24+, Docker (for the local Postgres)
docker compose up -d        # Postgres 16 on :5433 (dev) + :5434 (test)

# 1. Install
npm install

# 2. Configure
cp .env.example .env        # defaults already point at docker-compose

# 3. Apply migrations + run
npm run db:migrate          # creates the schema in Postgres
npm run dev                 # http://localhost:5173

# 4. Test & check
npm test                    # 454 tests (needs TEST_DATABASE_URL; docker-compose's test-db)
npm run check               # svelte-check

# 5. Edit schema
npm run db:generate         # after editing schema.ts → new SQL migration
```

**Any Postgres provider works** — Neon, Railway, Supabase-direct, Fly.io, or
self-hosted. Just point `DATABASE_URL` at it and run `npm run db:migrate`.

**Verified from a clean copy of the purchased source** (not a claim about this
repository, which contains no application): fresh `npm install` → `docker compose up -d` →
migrations → tests → check → dev server → signup all pass.

> `npm test` **needs the Postgres container running** (`docker compose up -d`, then
> wait ~10s). It runs against a real database, not a mock or an in-memory stand-in —
> that is the point of this track. Without the container the suite fails with
> `ECONNREFUSED`. Because the suite also runs real scrypt at the OWASP work factor,
> a full run takes roughly 3–4 minutes.
>
> **One suite at a time.** These tests share one database and reset it between
> tests, so two concurrent runs would destroy each other's data and report a
> misleading wall of foreign-key errors. A run takes a lock for its duration; a
> second one stops immediately and says so:
> `another test suite is using this database — wait for it to finish, or point
TEST_DATABASE_URL somewhere else.` On CI, give each shard its own database
> instead of fighting over one.

## Try the full loop

1. Sign up (min 10-char password) → you land on `/app`.
2. Create an organization → you are its `owner`.
3. Invite a member → a one-time link like `/invite/<token>` is shown **once** (stored hashed).
4. Open the link in a private window → sign up → you're in as `member`.
5. As owner, change roles, transfer ownership, or remove members; watch every event appear in the org's **Audit log** tab — and export it as CSV/JSON (the export is logged too).
6. Hit the seat limit (default 3) and see the honest error.
7. Open **Sessions** in the header to see every device signed in, revoke one, or sign out everywhere.

## Environment variables

| Variable               | Default              | Purpose                                                  |
| ---------------------- | -------------------- | -------------------------------------------------------- |
| `DATABASE_URL`         | (required)           | Postgres connection string (app)                         |
| `TEST_DATABASE_URL`    | (required for tests) | Postgres connection string (test DB, truncated per test) |
| `PG_MAX_CONNECTIONS`   | `20`                 | Connection pool size (postgres.js)                       |
| `PG_IDLE_TIMEOUT`      | `20`                 | Idle-connection close timeout (s), read by the driver    |
| `PG_CONNECT_TIMEOUT`   | `10`                 | Connection timeout (s), read by the driver               |
| `MOCK_PLAN_SEATS`      | `3`                  | Seat limit while on MockBilling                          |
| `AUTH_FAILED_ATTEMPTS` | `5`                  | Failed attempts allowed per window                       |
| `AUTH_WINDOW_MS`       | `900000`             | Sliding window for failed auth attempts                  |

## Where things live

| Path                                    | Purpose                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/lib/server/db/schema.ts`           | Drizzle Postgres schema — users, sessions, organizations, memberships, invites, audit_log |
| `src/lib/server/db/index.ts`            | postgres.js driver + Drizzle handle + auto-migrations at boot                             |
| `drizzle/`                              | Checked-in SQL migrations (applied via `migrate()` at boot)                               |
| `rls/`                                  | Opt-in Row-Level Security policies (defense-in-depth hardening)                           |
| `src/lib/server/rbac.ts`                | Roles, permission matrix, hierarchy helpers                                               |
| `src/lib/server/auth.ts`                | scrypt hashing (N=2^17), session issue/verify/revoke/list/cleanup                         |
| `src/routes/app/sessions/`              | Your own sessions: list, revoke one, sign out everywhere                                  |
| `src/routes/app/org/[id]/audit/export/` | Audit-log export (CSV/JSON), POST-only, itself audit-logged                               |
| `src/lib/server/ratelimit.ts`           | `RateLimiter` seam + sliding-window failed-attempt limiter                                |
| `src/lib/server/services/`              | Org / member / invite domain logic (pure functions taking `Db`)                           |
| `src/lib/server/billing/`               | Adapter interface, mock implementation, wiring point                                      |
| `tests/`                                | Vitest suites against a real Postgres test database                                       |
| `docker-compose.yml`                    | Local Postgres (dev :5433 + test :5434)                                                   |
| `docs/`                                 | architecture · rbac · billing · testing · deployment · ai-billing · versioning            |

## Design rules worth knowing

- **Server-side enforcement everywhere**: UI hides controls, but every load/action re-checks membership and permissions against fresh DB state.
- **Tenancy is app-enforced by default; RLS is opt-in**: a pooled Postgres connection has no per-user identity (unlike Supabase), so the service layer is the tenancy boundary. `rls/0010_rls_policies.sql` adds database-level defense-in-depth for setups that adopt the per-request `app.current_user_id` GUC pattern (see `docs/deployment.md`). To be precise: **no migration in `drizzle/` applies those policies** — until you run that `psql` command yourself, the app is protected by the service layer alone, which is a supported and tested configuration, not a degraded one.
- **Your own sessions are yours alone to end**: `/app/sessions` revokes only sessions belonging to the account making the request. The user id is re-derived from the httpOnly session cookie server-side, and the `DELETE` is additionally scoped by `sessions.user_id`, so a crafted form cannot reach another account.
- **Check-then-act is serialised, because Postgres really is concurrent**: leaving an org, transferring ownership, and accepting an invite all take `SELECT … FOR UPDATE` on the organization row as the transaction's first statement. `tests/members-concurrency.test.ts` starts two genuinely simultaneous requests and asserts on the committed result — on the SQLite sibling kit the process-wide mutex makes these windows unreachable, which is exactly why they need proving here.
- **CSV export cannot become an attack on your spreadsheet**: exported values containing commas, quotes or newlines round-trip byte-for-byte, and anything a spreadsheet would evaluate as a formula is prefixed with an apostrophe first.
- **Failed logins are expensive for the attacker, cheap for you**: attempts are counted per IP+email behind a swappable seam, and blocked keys are rejected before any password hashing happens.
- **Hierarchy is strict**: actors act only downward (`owner > admin > member`); grants never reach the actor's own rank; the last owner can neither leave nor be removed.
- **Secrets are stored hashed**: invite tokens and session tokens exist raw only at the moment of use.
- **No ORM lock-in at the edges**: domain services accept any `Db`, so the org/member/invite logic is written against a driver rather than baked into it. The SQLite sibling kit runs the same domain model over `better-sqlite3`. The two are siblings, not ports — see "Same architecture… but not a driver swap" above for exactly how far that goes.
- **Audit is append-only**: writers only; readers query; nothing deletes.

## Versioning & Releases

**Standing Rule:** Releases are cut by the VerdantStack release pipeline (bump → changelog → tag → public release) — this repo has no `npm run release`. Merges must keep the tree green:

```bash
npm test               # 454 tests
npm run check          # svelte-check
npm run build          # production build
npm run docs:api:check # API reference in sync (typedoc)
```

See [CHANGELOG.md](CHANGELOG.md) for change history and [docs/versioning.md](docs/versioning.md) for the full process.

## License

The full source is included with your purchase under the
[End User License Agreement](https://verdantstack.dev/docs/license/).

30-day refund policy. Contact: verdantstack@proton.me

---

<p align="center">
  Built by <a href="https://github.com/verdantstack">VerdantStack</a>
</p>

<p align="center">
  <sub>Like this project? <a href="https://www.patreon.com/cw/VerdantStack">Support us on Patreon</a> for $5/month.</sub><br>
  <sub>Prefer GitHub? Hit the <b>Sponsor</b> button above — it goes to the same Patreon page.</sub>
</p>
