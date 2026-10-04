[**sveltekit-postgres-starter**](../../README.md)

***

# Function: openDb()

> **openDb**(`url`, `opts`): `Promise`\<\{ `client`: `Sql`; `db`: [`Db`](../type-aliases/Db.md); \}\>

Open a Postgres connection, apply the checked-in migrations, and return both
the Drizzle handle and the underlying `postgres.js` client.

## Parameters

### url

`string`

A Postgres connection string (`postgres://user:pass@host:port/db`).

### opts

Options.

#### max?

`number`

Max pooled connections (default the `postgres.js` default of
  10; production callers may set a larger pool).

#### schema?

`string`

An optional Postgres schema to create and target via
  `search_path`. Requires a single client connection (`max: 1`) so the
  `search_path` reliably scopes every query — used by tests to isolate each
  worker's data.

## Returns

`Promise`\<\{ `client`: `Sql`; `db`: [`Db`](../type-aliases/Db.md); \}\>

`{ db, client }` — the migrated Drizzle handle and the client.

## Remarks

`prepare: false` is required by the Drizzle Postgres migrator, which
uses execution semantics incompatible with the prepared-statement cache.
