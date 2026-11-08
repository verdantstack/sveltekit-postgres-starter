[**sveltekit-postgres-starter**](../../README.md)

***

# Type Alias: Db

> **Db** = `PostgresJsDatabase`\<*typeof* [`db/schema`](../schema/README.md)\>

A Drizzle handle over the Postgres connection, typed against the full schema.
Pass it into services — they never open their own connection.
