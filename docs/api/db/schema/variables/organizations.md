[**sveltekit-postgres-starter**](../../../README.md)

***

# Variable: organizations

> `const` **organizations**: `PgTableWithColumns`\<\{ `columns`: \{ `createdAtMs`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgBigInt53"`; `data`: `number`; `dataType`: `"number"`; `driverParam`: `string` \| `number`; `enumValues`: `undefined`; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `false`; `name`: `"created_at_ms"`; `notNull`: `true`; `tableName`: `"organizations"`; \}, \{ \}, \{ \}\>; `dpaAcceptedAtMs`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgBigInt53"`; `data`: `number`; `dataType`: `"number"`; `driverParam`: `string` \| `number`; `enumValues`: `undefined`; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `false`; `name`: `"dpa_accepted_at_ms"`; `notNull`: `false`; `tableName`: `"organizations"`; \}, \{ \}, \{ \}\>; `id`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgUUID"`; `data`: `string`; `dataType`: `"string"`; `driverParam`: `string`; `enumValues`: `undefined`; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `true`; `name`: `"id"`; `notNull`: `true`; `tableName`: `"organizations"`; \}, \{ \}, \{ \}\>; `name`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgText"`; `data`: `string`; `dataType`: `"string"`; `driverParam`: `string`; `enumValues`: \[`string`, `...string[]`\]; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `false`; `name`: `"name"`; `notNull`: `true`; `tableName`: `"organizations"`; \}, \{ \}, \{ \}\>; `regionCode`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgText"`; `data`: `string`; `dataType`: `"string"`; `driverParam`: `string`; `enumValues`: \[`string`, `...string[]`\]; `generated`: `undefined`; `hasDefault`: `true`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `false`; `name`: `"region_code"`; `notNull`: `true`; `tableName`: `"organizations"`; \}, \{ \}, \{ \}\>; `slug`: `PgColumn`\<\{ `baseColumn`: `never`; `columnType`: `"PgText"`; `data`: `string`; `dataType`: `"string"`; `driverParam`: `string`; `enumValues`: \[`string`, `...string[]`\]; `generated`: `undefined`; `hasDefault`: `false`; `hasRuntimeDefault`: `false`; `identity`: `undefined`; `isAutoincrement`: `false`; `isPrimaryKey`: `false`; `name`: `"slug"`; `notNull`: `true`; `tableName`: `"organizations"`; \}, \{ \}, \{ \}\>; \}; `dialect`: `"pg"`; `name`: `"organizations"`; `schema`: `undefined`; \}\>

Top-level tenant. `slug` is unique and used in profile URLs for routing
within the product.

`regionCode` is the jurisdiction the tenant's data is recorded as living in.
It is a plain `text` column rather than a foreign key to a regions table on
purpose: the region catalogue is code (`src/lib/server/regions.ts`), so a
tenant cannot be homed in a jurisdiction this deployment does not run by
inserting a row. The column carries a database default matching the shipping
default region so the migration never leaves an existing row unplaced, and
`services/residency.ts` is the only writer after creation.

`dpaAcceptedAtMs` is a timestamp, not a boolean: a reviewer asks *when* a
data-processing agreement was accepted, and "yes" cannot be reconciled with a
contract version.
