[**sveltekit-postgres-starter**](../../README.md)

***

# Interface: AsyncRateLimiter

Create a DB-backed sliding-window rate limiter.

## Param

Database connection.

## Param

Limiter configuration.

## Param

Window length in ms.

## Param

Max attempts per window.

## Methods

### check()

> **check**(`key`): [`Verdict`](../../ratelimit/interfaces/Verdict.md) \| `Promise`\<[`Verdict`](../../ratelimit/interfaces/Verdict.md)\>

#### Parameters

##### key

`string`

#### Returns

[`Verdict`](../../ratelimit/interfaces/Verdict.md) \| `Promise`\<[`Verdict`](../../ratelimit/interfaces/Verdict.md)\>

***

### penalize()

> **penalize**(`key`): [`Verdict`](../../ratelimit/interfaces/Verdict.md) \| `Promise`\<[`Verdict`](../../ratelimit/interfaces/Verdict.md)\>

#### Parameters

##### key

`string`

#### Returns

[`Verdict`](../../ratelimit/interfaces/Verdict.md) \| `Promise`\<[`Verdict`](../../ratelimit/interfaces/Verdict.md)\>

***

### reset()

> **reset**(`key`): `void` \| `Promise`\<`void`\>

#### Parameters

##### key

`string`

#### Returns

`void` \| `Promise`\<`void`\>
