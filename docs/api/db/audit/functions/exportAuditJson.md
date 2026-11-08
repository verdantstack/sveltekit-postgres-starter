[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: exportAuditJson()

> **exportAuditJson**(`db`, `orgId`, `limit`, `offset`): `Promise`\<`Record`\<`string`, `unknown`\>[]\>

Export an organization's audit log as JSON.

## Parameters

### db

The database handle (pool or transaction).

[`Db`](../../type-aliases/Db.md) | `PgTransaction`\<`PostgresJsQueryResultHKT`, [`db/schema`](../../schema/README.md), `ExtractTablesWithRelations`\<[`db/schema`](../../schema/README.md)\>\>

### orgId

`string`

The organization id.

### limit

`number` = `1000`

Maximum rows to export (default `1000`, capped at [MAX\_EXPORT\_ROWS](../variables/MAX_EXPORT_ROWS.md)).

### offset

`number` = `0`

Row offset (default `0`).

## Returns

`Promise`\<`Record`\<`string`, `unknown`\>[]\>

One object per row: `seq`, ISO `createdAt`, the nullable identity and
target fields, and parsed `metadata` (`null` when absent or unparseable).

## Remarks

`metadata` is parsed back into real JSON rather than shipped as an
escaped string, so a consumer gets a usable document. A row whose stored
`metadata_json` is not parseable falls back to the **raw string** rather than
aborting the whole export: one corrupt row should cost you that row's structure,
not every event after it. The append-only log has no UPDATE path, so a bad row
can never be repaired — silently dropping the export would be worse.
