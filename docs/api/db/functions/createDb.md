[**sveltekit-postgres-starter**](../../README.md)

***

# Function: createDb()

> **createDb**(`url`, `opts`): `Promise`\<[`Db`](../type-aliases/Db.md)\>

Open a Postgres database and apply the checked-in migrations.

## Parameters

### url

`string`

A Postgres connection string.

### opts

Optional per-schema setup (see [openDb](openDb.md)).

#### schema?

`string`

## Returns

`Promise`\<[`Db`](../type-aliases/Db.md)\>

The migrated database handle.
