[**sveltekit-postgres-starter**](../../README.md)

***

# Function: destroyAllSessions()

> **destroyAllSessions**(`db`, `userId`, `currentTokenId?`): `Promise`\<`void`\>

Destroy all sessions for a user except the current one.

## Parameters

### db

[`Db`](../../db/type-aliases/Db.md)

The database handle.

### userId

`string`

The id of the user whose sessions to destroy.

### currentTokenId?

`string`

The sha256 hash of the current session token to preserve (optional).

## Returns

`Promise`\<`void`\>
