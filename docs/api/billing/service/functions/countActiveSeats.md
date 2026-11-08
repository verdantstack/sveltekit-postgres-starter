[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: countActiveSeats()

> **countActiveSeats**(`db`, `orgId`): `Promise`\<`number`\>

Count the memberships (seats) currently used by an organization.

## Parameters

### db

The database handle.

[`Db`](../../../db/type-aliases/Db.md) | `PgTransaction`\<`PostgresJsQueryResultHKT`, [`db/schema`](../../../db/schema/README.md), `ExtractTablesWithRelations`\<[`db/schema`](../../../db/schema/README.md)\>\>

### orgId

`string`

The organization id.

## Returns

`Promise`\<`number`\>

The number of active members.
