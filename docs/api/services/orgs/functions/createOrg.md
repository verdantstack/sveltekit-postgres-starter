[**sveltekit-postgres-starter**](../../../README.md)

***

# Function: createOrg()

> **createOrg**(`db`, `userId`, `rawName`, `options`): `Promise`\<\{ `createdAtMs`: `number`; `dpaAcceptedAtMs`: `number` \| `null`; `id`: `string`; `name`: `string`; `regionCode`: `string`; `slug`: `string`; \}\>

Create an organization and make `userId` its first owner.

## Parameters

### db

[`Db`](../../../db/type-aliases/Db.md)

The database handle.

### userId

`string`

The id of the user creating the organization.

### rawName

`string`

The organization name; trimmed and validated to 2–80 characters.

### options

[`CreateOrgOptions`](../interfaces/CreateOrgOptions.md) = `{}`

Region choice for the new tenant — see [CreateOrgOptions](../interfaces/CreateOrgOptions.md).

## Returns

`Promise`\<\{ `createdAtMs`: `number`; `dpaAcceptedAtMs`: `number` \| `null`; `id`: `string`; `name`: `string`; `regionCode`: `string`; `slug`: `string`; \}\>

The created organization row, including its recorded `regionCode` and
`dpaAcceptedAtMs`.

## Remarks

A random suffix is appended to the slug to keep it unique. The caller
is automatically inserted as a membership with role `owner`.

## Throws

with code `bad_name` when the name is out of range, or
`not_found` when no unique slug could be allocated.

## Throws

`unknown_region`, `region_not_accepting` or
`dpa_required` when the requested region cannot take this tenant.
