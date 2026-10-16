[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: countAudit()

> **countAudit**(`db`, `orgId`): `Promise`\<`number`\>

Count an organization's audit entries, ignoring pagination.

## Parameters

### db

The database handle (pool or transaction).

[`Db`](../../type-aliases/Db.md) | `PgTransaction`\<`PostgresJsQueryResultHKT`, [`db/schema`](../../schema/README.md), `ExtractTablesWithRelations`\<[`db/schema`](../../schema/README.md)\>\>

### orgId

`string`

The organization whose events to count.

## Returns

`Promise`\<`number`\>

The total number of audit rows for the organization.

## Remarks

This is a `count(*)` aggregate executed by Postgres. It does not pull
every matching row into memory to measure the array — an append-only log grows
forever, so "how many events are there" must not cost O(events) application
memory or a full table transfer. Postgres returns `bigint` for `count(*)`,
which arrives as a string on the wire, hence the explicit `::int` cast: a
`bigint` past 2^31 would silently become a float if left to `parseInt` on the
JS side, and this kit's rows are milliseconds-since-epoch sized numbers, not
anything near that, but the cast makes the narrowing explicit rather than
accidental.
