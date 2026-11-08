[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: revokeAllOtherSessions()

> **revokeAllOtherSessions**(`db`, `input`): `Promise`\<\{ `pruned`: `number`; `revoked`: `number`; \}\>

"Sign out everywhere else": end every session except the one making the request,
then prune rows that are already expired.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

The database handle.

### input

#### sessionToken

`string` \| `undefined`

The raw token from the session cookie.

## Returns

`Promise`\<\{ `pruned`: `number`; `revoked`: `number`; \}\>

How many live sessions were revoked and how many expired rows were pruned.

## Remarks

The pruning is part of this operation rather than a background job
because this is the moment the caller is looking at the list: a stale row they
just saw disappear is a row they will not ask about later. It is reported
separately (`pruned`) so nobody reads "9 revoked" when two of them had expired
months ago.

## Throws

with code `unauthenticated` when there is no live session.
