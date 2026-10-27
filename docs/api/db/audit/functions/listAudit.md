[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: listAudit()

> **listAudit**(`db`, `orgId`, `limit`, `offset`): `Promise`\<[`AuditRow`](../type-aliases/AuditRow.md)[]\>

Page through an organization's audit events, newest first.

## Parameters

### db

The database handle to query.

[`Db`](../../type-aliases/Db.md) | `PgTransaction`\<`PostgresJsQueryResultHKT`, [`db/schema`](../../schema/README.md), `ExtractTablesWithRelations`\<[`db/schema`](../../schema/README.md)\>\>

### orgId

`string`

The organization whose events to list.

### limit

`number` = `100`

Maximum rows to return (default `100`).

### offset

`number` = `0`

Row offset for pagination (default `0`).

## Returns

`Promise`\<[`AuditRow`](../type-aliases/AuditRow.md)[]\>

A promise resolving to the matching audit rows, ordered by descending sequence.
