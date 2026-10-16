[**sveltekit-postgres-starter**](../../README.md)

***

# Function: cleanupExpiredSessions()

> **cleanupExpiredSessions**(`db`): `Promise`\<`number`\>

Remove expired sessions from the database and report how many were pruned.

## Parameters

### db

[`Db`](../../db/type-aliases/Db.md)

The database handle.

## Returns

`Promise`\<`number`\>

The number of expired session rows deleted.

## Remarks

`getUserBySessionToken()` treats an expired session as unauthenticated
but **leaves the row in place** — the same rule that makes a logout race
harmless. Without a sweeper the `sessions` table therefore grows without bound
on a long-lived install: rows are written on every login and only removed when
the user logs out. Schedule this from a cron/worker, not per request.
