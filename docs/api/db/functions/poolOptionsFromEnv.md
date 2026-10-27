[**sveltekit-postgres-starter**](../../README.md)

***

# Function: poolOptionsFromEnv()

> **poolOptionsFromEnv**(): `object`

Resolve the `postgres.js` pool options this kit documents.

## Returns

`object`

Options shaped for [openDb](openDb.md), ready to spread.

### connectTimeout

> **connectTimeout**: `number`

### idleTimeout

> **idleTimeout**: `number`

### max

> **max**: `number`

## Remarks

`README.md`, `AGENTS.md`, `.env.example` and `docs/deployment.md` all
advertise `PG_MAX_CONNECTIONS`, `PG_IDLE_TIMEOUT` and `PG_CONNECT_TIMEOUT`. Two
of those three were never actually read by this kit: the driver was constructed
with only `max`, so an operator tuning `PG_IDLE_TIMEOUT` for a constrained
instance (a Fly/Neon free tier, a PgBouncer-backed box) watched the setting sit
in `.env` doing nothing. A documented knob that does nothing is worse than no
knob — it is a claim about behaviour that is false. These are now wired to
postgres.js's `max`, `idle_timeout` and `connect_timeout`.
