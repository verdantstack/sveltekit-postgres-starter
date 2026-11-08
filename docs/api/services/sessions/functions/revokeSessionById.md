[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: revokeSessionById()

> **revokeSessionById**(`db`, `input`): `Promise`\<\{ `deleted`: `boolean`; `signedOut`: `boolean`; \}\>

Revoke one of the caller's own sessions, **including the one they are using**.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

The database handle.

### input

#### sessionToken

`string` \| `undefined`

The raw token from the session cookie.

#### targetSessionId

`string`

The `sha256(token)` id of the session to revoke.

## Returns

`Promise`\<\{ `deleted`: `boolean`; `signedOut`: `boolean`; \}\>

`deleted: false` when no row matched (not the caller's, or already
ended) — the route turns that into a 404 without the service knowing about HTTP;
`signedOut: true` when the session revoked was the one making the request.

## Remarks

This is the service half of the `/app/sessions` revocation path, and it
exists because that path used to live in the route: `+page.server.ts` ran the
`DELETE`, wrote the audit row and decided the 404 itself, which is the one shape
the kit's first rule forbids. Moving it here is not cosmetic — the scope that
makes the delete safe (`sessions.user_id = <derived id>`) is now in the same file
as every other session operation, so the next route that wants to end a session
cannot forget it.

## Throws

with code `unauthenticated` when there is no live session.
