[**sveltekit-postgres-starter**](../../README.md)

***

# Variable: SCRYPT\_PARAMS

> `const` **SCRYPT\_PARAMS**: `object`

scrypt work factors used for **new** password hashes.

N = 2^17, r = 8, p = 1 — the OWASP Password Storage Cheat Sheet's stated
minimum for scrypt (a minimum CPU/memory cost of 2^17, block size 8,
parallelism 1), used verbatim so this comment names a configuration the
standard actually lists instead of gesturing at it. The previous N = 2^14, p = 1
pairing is not one OWASP lists: its five "similar minimal level of defense"
configurations are N=2^17/p=1, N=2^16/p=2, N=2^15/p=3, N=2^14/p=5 and
N=2^13/p=10.

## Type Declaration

### N

> `readonly` **N**: `131072` = `131072`

### p

> `readonly` **p**: `1` = `1`

### r

> `readonly` **r**: `8` = `8`

## Remarks

**Deliberately not env-configurable.** A knob like this eventually
gets set to its cheapest legal value by someone under deadline, and a work
factor is not a performance dial — it is the price of an offline attack against
a stolen hash table. Raising it is a deploy, not a config change.
