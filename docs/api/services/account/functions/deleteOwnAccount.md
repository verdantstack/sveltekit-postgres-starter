[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: deleteOwnAccount()

> **deleteOwnAccount**(`db`, `input`): `Promise`\<[`DeletedAccount`](../interfaces/DeletedAccount.md)\>

Erase the caller's own account.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

The database handle.

### input

The operation inputs.

#### sessionToken

`string` \| `undefined`

The raw token from the session cookie; `undefined`
  is not signed in.

## Returns

`Promise`\<[`DeletedAccount`](../interfaces/DeletedAccount.md)\>

What was removed.

## Throws

with code `unauthenticated` when there is no live
session, or `not_found` when the account row is already gone.

## Remarks

The counts are read **before** the delete in the same transaction:
after it they would be zero, and `ON DELETE CASCADE` does not report what it
took. Nothing else is read — an erasure path that loads the account's data to
"log" it would be writing a copy of the thing it was asked to destroy.
