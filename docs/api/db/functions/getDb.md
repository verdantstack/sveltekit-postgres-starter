[**sveltekit-postgres-starter**](../../README.md)

***

# Function: getDb()

> **getDb**(): `Promise`\<[`Db`](../type-aliases/Db.md)\>

Return the process-wide shared database, connecting on first call.

## Returns

`Promise`\<[`Db`](../type-aliases/Db.md)\>

A promise resolving to the shared database handle.

## Remarks

The connection is controlled by `DATABASE_URL` (required). The
singleton is memoized — later calls return the same handle. A connection pool
sized by `PG_MAX_CONNECTIONS` (default 20) is opened by the `postgres` driver.
