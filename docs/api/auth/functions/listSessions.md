[**sveltekit-postgres-starter**](../../README.md)

***

# Function: listSessions()

> **listSessions**(`db`, `userId`): `Promise`\<`object`[]\>

List all sessions for a user.

## Parameters

### db

[`Db`](../../db/type-aliases/Db.md)

The database handle.

### userId

`string`

The id of the user whose sessions to list.

## Returns

`Promise`\<`object`[]\>

Array of session objects with id and timestamps, oldest first.

## Remarks

Ordered by creation time, oldest first. The `ORDER BY` is not cosmetic:
Postgres makes **no** guarantee about row order without one, so "show me my
sessions" would otherwise render in whatever order the plan happened to produce.
The SQLite sibling of this kit returns rows in rowid order, which coincides with
insertion order — so dropping this clause there is invisible in testing and
non-deterministic here. It is pinned by `tests/auth.test.ts`.
