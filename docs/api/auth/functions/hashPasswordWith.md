[**sveltekit-postgres-starter**](../../README.md)

***

# Function: hashPasswordWith()

> **hashPasswordWith**(`password`, `params`): `Promise`\<`string`\>

Derive a scrypt hash with explicit parameters.

## Parameters

### password

`string`

The plaintext password.

### params

The scrypt work factors to use.

#### N

`number`

#### p

`number`

#### r

`number`

## Returns

`Promise`\<`string`\>

A self-describing `scrypt$N$r$p$salt$hash` string.

## Remarks

Exported for exactly one reason: the **upgrade-path test**. Producing a
hash under the previous work factor and asserting it still verifies is the only
honest way to show that bumping [SCRYPT\_PARAMS](../variables/SCRYPT_PARAMS.md) is a deploy rather than a
lockout — and it cannot be written against `hashPassword()`, which always uses
the current parameters. A production caller has no reason to touch this.
