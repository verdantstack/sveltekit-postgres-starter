[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: listMembers()

> **listMembers**(`db`, `orgId`): `Promise`\<[`MemberRow`](../type-aliases/MemberRow.md)[]\>

List all members of an organization with their roles.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

The database handle.

### orgId

`string`

The organization id.

## Returns

`Promise`\<[`MemberRow`](../type-aliases/MemberRow.md)[]\>

An array of `MemberRow`.

## Remarks

Ordered by join time, oldest first, with the membership id as a
tie-breaker. That is a **total** order on purpose: Postgres returns rows in
whatever order the plan produces, so without an `ORDER BY` the org dashboard's
member table can reorder itself between two identical requests — a seq scan and
an index scan over identical data need not agree. `createdAtMs` alone is not
enough either: two members who accept invites inside the same millisecond (a
test does it constantly, a burst signup genuinely does it) would still swap
places, so the id breaks the tie and the ordering is fully deterministic.
