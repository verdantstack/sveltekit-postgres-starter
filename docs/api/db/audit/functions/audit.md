[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: audit()

> **audit**(`db`, `entry`): `Promise`\<`void`\>

Append-only audit writer. There is deliberately no update/delete API —
compliance buyers ask for exactly this property.

## Parameters

### db

The database handle to write into (pool handle or transaction handle).

[`Db`](../../type-aliases/Db.md) | `PgTransaction`\<`PostgresJsQueryResultHKT`, [`db/schema`](../../schema/README.md), `ExtractTablesWithRelations`\<[`db/schema`](../../schema/README.md)\>\>

### entry

[`AuditEntry`](../type-aliases/AuditEntry.md)

The event to record; `metadata` is serialized to JSON and stored as text.

## Returns

`Promise`\<`void`\>

A promise that resolves once the event is persisted.
