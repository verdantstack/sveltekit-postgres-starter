[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: acceptInvite()

> **acceptInvite**(`db`, `input`): `Promise`\<\{ `orgId`: `string`; `orgName`: `string`; `role`: `"owner"` \| `"admin"` \| `"member"`; \}\>

Atomically claim a single-use invite and add the user as a member.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

The database handle.

### input

The operation inputs.

#### billing

[`BillingAdapter`](../../../billing/adapter/interfaces/BillingAdapter.md)

The billing adapter used to enforce seat limits.

#### token

`string`

The raw invite token.

#### userId

`string`

The id of the user accepting the invite.

## Returns

`Promise`\<\{ `orgId`: `string`; `orgName`: `string`; `role`: `"owner"` \| `"admin"` \| `"member"`; \}\>

The joined org's id, name, and the granted role.

## Remarks

Acceptance runs as ONE transaction: the per-org row lock, the seat
check, the conditional claim, the membership insert, and the audit row either
all commit or all roll back.

Two independent gates are at work. The `UPDATE ... WHERE accepted_at_ms IS NULL
... RETURNING id` conditional claim is what makes a single-use link safe: zero
rows updated means someone got there first. The `FOR UPDATE` lock on the org row
is what makes the *seat* check safe: without it, two different invites accepted
at the same instant could each read "one seat free" and both insert, overshooting
the plan. The lock is always the transaction's first statement, so concurrent
accepts serialize instead of deadlocking.

## Throws

with code `invalid_token`, `expired`, `revoked`,
`already_accepted`, or `already_member`.

## Throws

with code `subscription_required` or `seat_limit` when
the org has no active plan or no seats are free — the invite stays unclaimed
and can be used again once a seat frees up.
