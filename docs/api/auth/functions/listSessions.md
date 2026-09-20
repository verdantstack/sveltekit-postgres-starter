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

Array of session objects with id and timestamps.
