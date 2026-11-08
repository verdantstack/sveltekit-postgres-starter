[**sveltekit-postgres-starter**](../../../README.md)

***

# Interface: DeletedAccount

What [deleteOwnAccount](../functions/deleteOwnAccount.md) removed, for the audit record and the caller.

## Properties

### membershipsRemoved

> **membershipsRemoved**: `number`

How many organization memberships were cascaded away.

***

### sessionsRemoved

> **sessionsRemoved**: `number`

How many live sessions were cascaded away.

***

### userId

> **userId**: `string`

The erased user id.
