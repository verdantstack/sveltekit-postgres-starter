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

#### connectTimeout?

`number`

Seconds to wait when establishing a connection
  (default: `PG_CONNECT_TIMEOUT`, else 10).

#### idleTimeout?

`number`

Seconds before an idle pooled connection is closed
  (default: `PG_IDLE_TIMEOUT`, else 20).

#### max?

`number`

Max pooled connections. Ignored when `schema` is set, which
  always pins the pool to 1.

#### schema?

`string`

An optional Postgres schema to create and target via
  `search_path`. Forces a single-connection client (see the remark below).

## Returns

`Promise`\<\{ `client`: `Sql`; `db`: [`Db`](../type-aliases/Db.md); \}\>

`{ db, client }` — the migrated Drizzle handle and the client.

## Remarks

`prepare: false` is required by the Drizzle Postgres migrator, which
uses execution semantics incompatible with the prepared-statement cache.
