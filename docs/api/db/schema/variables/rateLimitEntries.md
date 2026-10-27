[**sveltekit-postgres-starter**](../../../README.md)

***

# Variable: rateLimitEntries

> `const` **rateLimitEntries**: `PgTableWithColumns`\<\{ `columns`: \{ `id`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgUUID"`; `data`: `string`; `dataType`: `"string"`; `driverParam`: `string`; `enumValues`: `undefined`; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `true`; `name`: `"id"`; `notNull`: `true`; `tableName`: `"rate_limit_entries"`; \}, \{ \}, \{ \}\>; `key`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgText"`; `data`: `string`; `dataType`: `"string"`; `driverParam`: `string`; `enumValues`: \[`string`, `...string[]`\]; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `false`; `name`: `"key"`; `notNull`: `true`; `tableName`: `"rate_limit_entries"`; \}, \{ \}, \{ \}\>; `timestampMs`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgBigInt53"`; `data`: `number`; `dataType`: `"number"`; `driverParam`: `string` \| `number`; `enumValues`: `undefined`; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `false`; `name`: `"timestamp_ms"`; `notNull`: `true`; `tableName`: `"rate_limit_entries"`; \}, \{ \}, \{ \}\>; \}; `dialect`: `"pg"`; `name`: `"rate_limit_entries"`; `schema`: `undefined`; \}\>

Rate limit entries for shared-store rate limiting.
