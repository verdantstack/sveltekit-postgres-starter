[**sveltekit-postgres-starter**](../../README.md)

***

# Variable: MIGRATION\_LOCK\_KEY

> `const` **MIGRATION\_LOCK\_KEY**: `8240173` = `8_240_173`

Advisory-lock key guarding the migration run.

`pg_advisory_lock` is **session-scoped**, so the lock and the DDL must run on
the same physical connection — see [openDb](../functions/openDb.md). The value is a coordination
constant shared by every instance and every version, so it must never change
once released: changing it would split migrating processes into two groups
that no longer exclude each other.

`@internal` exported so `scripts/migrate.ts` takes the *same* key. If the CLI
and the boot path used different keys, running `db:migrate` would not exclude
a booting replica, which is the exact race this closes.
