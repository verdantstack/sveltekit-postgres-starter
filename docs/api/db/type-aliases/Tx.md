[**sveltekit-postgres-starter**](../../README.md)

***

# Type Alias: Tx

> **Tx** = `Parameters`\<`Parameters`\<[`Db`](Db.md)\[`"transaction"`\]\>\[`0`\]\>\[`0`\]

The transaction-scoped handle yielded by `Db['transaction']`. Helpers that must
participate in a caller's transaction accept `Db | Tx` so the same code runs
inside or outside a transaction.
