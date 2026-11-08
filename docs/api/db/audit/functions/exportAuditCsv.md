[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: exportAuditCsv()

> **exportAuditCsv**(`db`, `orgId`, `limit`, `offset`): `Promise`\<`string`\>

Export an organization's audit log as CSV.

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

`Promise`\<`string`\>

A CSV document with a `seq,createdAt,actorUserId,action,targetType,targetId,metadata` header.

## Remarks

Rows are the same newest-first page [listAudit](listAudit.md) returns, with
`limit`/`offset` bounded by [clampExportPage](clampExportPage.md) and defaults suited to a
compliance export (1000 rows). The header is always emitted, even for an empty
page, so a consumer can tell "no events" from "wrong query".
