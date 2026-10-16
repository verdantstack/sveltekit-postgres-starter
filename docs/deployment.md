# Deployment

This kit is a plain SvelteKit application whose only external dependency is a **Postgres** database. Deploy the app anywhere SvelteKit runs, point it at any Postgres provider, apply migrations, done.

```mermaid
flowchart TD
    subgraph DEPLOY["Deployment Flow"]
        direction TB
        STEP1["1. Provision Postgres<br/>(Neon / Railway / Supabase / Fly / self-hosted)"]
        STEP2["2. Configure<br/>cp .env.example .env<br/>DATABASE_URL=..."]
        STEP3["3. Apply migrations<br/>npm run db:migrate"]
        STEP4["4. Deploy the app<br/>npm ci && npm run build"]
        STEP5["5. (Optional) Connection pooling<br/>PgBouncer / Neon built-in"]
        STEP6["6. (Optional) RLS hardening<br/>psql -f rls/0010_rls_policies.sql"]
        STEP1 --> STEP2 --> STEP3 --> STEP4 --> STEP5 --> STEP6
    end

    subgraph PROVIDERS["Postgres Providers"]
        direction LR
        NEON[("☁️ Neon<br/>Free tier · serverless")]
        RAILWAY[("🚂 Railway<br/>~$5/mo")]
        SUPA[("⚡ Supabase<br/>Free tier")]
        FLY[("🪁 Fly.io<br/>~$0–$5")]
        SELF[("🏠 Self-hosted<br/>docker compose")]
    end

    subgraph PLATFORMS["App Platforms"]
        direction LR
        CF["Cloudflare Pages/Workers"]
        VERCEL["Vercel / Netlify"]
        FLY2["Fly.io / Railway"]
        NODE["Node.js server"]
    end

    STEP1 -.-> PROVIDERS
    STEP4 -.-> PLATFORMS

    classDef deploy fill:#e3f2fd,stroke:#1565c0
    classDef provider fill:#e8f5e9,stroke:#2e7d32
    classDef platform fill:#fff3e0,stroke:#ef6c00

    class STEP1,STEP2,STEP3,STEP4,STEP5,STEP6 deploy
    class NEON,RAILWAY,SUPA,FLY,SELF provider
    class CF,VERCEL,FLY2,NODE platform
```

## 1. Provision Postgres

| Provider                       | Free tier         | Notes                                                                      |
| ------------------------------ | ----------------- | -------------------------------------------------------------------------- |
| [Neon](https://neon.tech)      | ✅ (0.5 GB)       | Serverless, branching, auto-scaling; includes pooling (PgBouncer built in) |
| [Railway](https://railway.app) | ❌ (~$5/mo)       | Simple, managed Postgres add-on                                            |
| Supabase (direct)              | ✅                | Use the direct Postgres connection string to stay provider-neutral         |
| [Fly.io](https://fly.io)       | ❌ (small ~$0–$5) | Run your own Postgres on Fly                                               |
| Self-hosted                    | ✅                | `docker compose up -d` is the same image used here                         |

Any provider works — the code only needs a connection string.

## 2. Configure

```bash
cp .env.example .env
# .env: DATABASE_URL=postgres://user:pass@host:5432/dbname
```

## 3. Apply migrations

```bash
npm run db:migrate     # applies drizzle/ migrations to DATABASE_URL
```

Migrations are also applied automatically at app boot (`createDb()` runs the Drizzle migrator), so an app instance can never run against an unmigrated schema.

### Running more than one instance? Read this

The boot-time migrator is a **safety net, not a deployment strategy**. Migrations run inside a
Postgres advisory lock (`pg_advisory_lock(8240173)`, key exported as `MIGRATION_LOCK_KEY`), so
instances booting at the same moment serialise: the first applies what is pending, the rest wait and
then find nothing to do. Concurrent boot is therefore safe.

Two things the lock does **not** do, and it is worth being precise about which is which:

- It does not make the boot migration a _reviewed_ event. You still cannot see what ran until you
  read the logs. That is the argument for the pre-deploy step below.
- It does not make a `maxAge`-style timeout. The lock blocks: a booting instance waits for the
  current migrator rather than skipping the migration. That is intentional — a second migrator
  running in parallel is the failure being prevented.

The lock is also not a substitute for the migrator's transaction. Drizzle wraps each run in
`session.transaction(...)`, which is what makes an _interrupted_ run roll back cleanly. Neither
mechanism alone prevents two _concurrent_ runs: both read the applied-migrations table before
either commits, so both decide the same migration is pending. The lock is what closes that window.

| Deployment                          | What to do                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local dev, single instance, preview | Nothing — boot-time migration is enough                                                                                                                                                  |
| **Multiple replicas / autoscaling** | Optional but recommended: run `npm run db:migrate` as a pre-deploy step so the migration is a reviewed, ordered event. It takes the same advisory lock, so it excludes booting replicas. |

The pre-deploy step means the migration is something you can watch, instead of something you
discover in a log after the fact. Two mechanisms are deliberate, not redundant: the explicit step
is the event, the boot-time call is the guarantee that no instance ever serves traffic against an
unmigrated schema.

## 4. Deploy the app

Standard SvelteKit deploy (any adapter):

```bash
npm ci
npm run build
```

- **Cloudflare Pages / Workers**: `@sveltejs/adapter-cloudflare` (the kit ships `adapter-auto`; pin a platform adapter in production).
- **Vercel / Netlify / Node**: the matching adapter from [SvelteKit docs](https://svelte.dev/docs/kit/adapters).
- **Fly.io / Railway / Render**: Node adapter + `npm run start`.

Set `DATABASE_URL` (and any `PG_*` tuning) in the platform's env config. Secrets stay out of the repo.

## 5. Connection pooling (PgBouncer / Supavisor)

The `postgres.js` driver pools client connections in-process (`PG_MAX_CONNECTIONS`, default 20). At higher concurrency, front your Postgres with a **transaction-mode pooler**:

```mermaid
graph LR
    subgraph APP["SvelteKit App"]
        POOL["postgres.js<br/>in-process pool<br/>PG_MAX_CONNECTIONS: 20"]
    end

    subgraph POOLER["Connection Pooler"]
        PGBOUNCER["PgBouncer / Supavisor<br/>transaction mode"]
    end

    subgraph DB["Postgres"]
        SERVER["PostgreSQL Server<br/>max_connections"]
    end

    POOL -->|"DATABASE_URL<br/>(port 6432)"| PGBOUNCER
    PGBOUNCER -->|"server connections<br/>(default_pool_size)"| SERVER

    classDef app fill:#e3f2fd,stroke:#1565c0
    classDef pooler fill:#fff3e0,stroke:#ef6c00
    classDef db fill:#e8f5e9,stroke:#2e7d32

    class POOL app
    class PGBOUNCER pooler
    class SERVER db
```

Note: Neon includes connection pooling built-in — use the pooled connection string directly.

- **Neon**: connection pooling is built in — use the pooled (port `5432`/`5433` pooler) connection string.
- **Self-hosted / Fly**: run PgBouncer in front of Postgres:
  ```ini
  [databases]
  app = host=postgres port=5432 dbname=app

  [pgbouncer]
  listen_port = 6432
  pool_mode = transaction
  max_client_conn = 200
  default_pool_size = 20
  ```
  Then `DATABASE_URL=postgres://user:pass@host:6432/app`.

| Variable             | Default | Meaning                               |
| -------------------- | ------- | ------------------------------------- |
| `PG_MAX_CONNECTIONS` | `20`    | In-process pool size (postgres.js)    |
| `PG_IDLE_TIMEOUT`    | `20`    | Seconds before idle connections close |
| `PG_CONNECT_TIMEOUT` | `10`    | Connection timeout in seconds         |

All three are read by `poolOptionsFromEnv()` in `src/lib/server/db/index.ts` and
passed straight to the `postgres.js` driver. A value that is unset, blank, zero or
negative falls back to the default rather than being passed through — `max: 0` or
`NaN` is an invalid pool, and a config typo should not become a boot failure.

When using a pooler, keep `PG_MAX_CONNECTIONS` roughly equal to the pooler's `default_pool_size` so you don't exhaust server connections.

## 6. RLS hardening (optional, defense-in-depth)

Tenancy is enforced in the application layer by default. To also enforce isolation at the database level:

```mermaid
flowchart TD
    subgraph SETUP["RLS Setup"]
        direction TB
        S1["1. Create low-privilege<br/>app_rw role"]
        S2["2. Apply policies<br/>rls/0010_rls_policies.sql"]
        S3["3. Set GUC in hooks.server.ts<br/>set_config(..., true)"]
        S1 --> S2 --> S3
    end

    subgraph ENFORCE["Runtime Enforcement"]
        direction TB
        REQ["Request arrives"] --> TXN["BEGIN"]
        TXN --> GUC["set_config(<br/>app.current_user_id, …, true)"]
        GUC --> QUERY["Run queries<br/>(RLS applies)"]
        QUERY --> COMMIT["COMMIT"]
        COMMIT -->|"GUC rolled back"| NEXT["Next request"]
    end

    SETUP --> ENFORCE

    classDef setup fill:#e3f2fd,stroke:#1565c0
    classDef enforce fill:#e8f5e9,stroke:#2e7d32

    class S1,S2,S3 setup
    class REQ,TXN,GUC,QUERY,COMMIT,NEXT enforce
```

Key property: **fail-closed** — any path that forgets the GUC returns **no rows**.

1. **Create a low-privilege app role** — NOT the table owner and NOT `postgres`. Grant only what the app needs:
   ```sql
   CREATE ROLE app_rw LOGIN PASSWORD '...';
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
   GRANT USAGE ON SCHEMA public TO app_rw;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
   ```
   Point the app's `DATABASE_URL` at this role. This is the role every request runs as, and the role the policies constrain.

2. **Apply the policies** (they `ENABLE` + `FORCE` RLS, so tables are fail-closed) — **as a role with `BYPASSRLS`, or a superuser. Not as `app_rw`, and not merely as the table owner**:
   ```bash
   psql "$ADMIN_DATABASE_URL" -f rls/0010_rls_policies.sql
   ```
   `FORCE` is exactly why ownership is not enough: it removes the exemption a table owner holds by ownership. Only a superuser or a `BYPASSRLS` role stays exempt, and the `SECURITY DEFINER` helpers need an exempt owner to break the recursion.
   The reason is not stylistic. `app_is_org_member()`, `app_org_role()` and `app_has_min_role()` all read `memberships`, and `memberships_select` is itself gated by `app_is_org_member(org_id)` — so those helpers are `SECURITY DEFINER` and each pins `search_path = public, pg_temp`. A `SECURITY DEFINER` function only escapes that recursion if the role owning it is exempt from RLS — which, under the `FORCE` in step 1's file, means `BYPASSRLS` or superuser rather than table ownership. Apply this file as `app_rw` and the helpers are owned by a role that is *subject* to the very policy they evaluate: the first request that sets the GUC fails with

   ```
   ERROR:  stack depth limit exceeded
   ```

   which is not a degraded result — it is every tenant-scoped read erroring out. `tests/rls-isolation.test.ts` runs this file against a live Postgres as a genuine non-superuser role and would catch it.
3. **Set per-request identity** in a transaction so the GUC is discarded when the transaction ends (`src/hooks.server.ts`):
   ```ts
   const db = await getDb();
   await db.execute(sql`BEGIN`);
   await db.execute(
     sql`SELECT set_config('app.current_user_id', ${locals.user?.id ?? ''}, true)`,
   );
   // ... resolve the request ...
   await db.execute(sql`COMMIT`);
   ```
   Any path that forgets the GUC returns **no rows** (fail-closed) — which is exactly the property you want from a safety net.

### 6.1 Why `set_config(..., true)` and not `SET LOCAL`

Two separate hazards hide in the one-line version of this step, and the two obvious spellings each fail differently.

**Syntax.** `SET` and `SET LOCAL` are utility commands, not functions, so they accept **no bind parameters**. `SET LOCAL app.current_user_id = $1` is a syntax error — `set_config(name, value, is_local)` is the parameterized form.

**Scope.** The third argument is the load-bearing part. A value set with `SET`, or with `set_config(..., false)`, is **session-scoped**: it survives the connection being returned to the pool. The next request that draws that backend can therefore inherit the **previous** tenant's identity. On a pooled driver that is a cross-tenant read, and it is close to invisible in development — one connection, one identity at a time — while appearing only under real pool churn.

Three things close it:

| Rule | Why |
|---|---|
| Scope to the transaction (`set_config(..., true)` inside `BEGIN`/`COMMIT`) | The value cannot outlive the request |
| On connection release, `RESET ALL` or `DISCARD ALL` | A backend can never carry an identity back to the pool |
| Never set the GUC once per *session* | Safe only under a true 1:1 app↔connection mapping, which a pool does not give you |

`SET LOCAL` **outside** a transaction block is a silent no-op with a warning. A missing `BEGIN` therefore leaves the GUC unset — which `FORCE ROW LEVEL SECURITY` turns into an empty result set rather than a full read. That is the fail-closed behaviour you want, but it surfaces as "the list is mysteriously empty", so set the value inside a real transaction.

`tests/rls-isolation.test.ts` proves the isolation this section claims: two accounts, the first transaction deliberately held open, and an assertion that account B sees zero of account A's rows. Run it against your own connection settings before you trust the pattern.

Tradeoffs: `FORCE ROW LEVEL SECURITY` changes the blast radius of a SQL injection bug from "read everything" to "read what the request's current user may read"; the cost is that every request must set the GUC, and the app role must be kept separate from admin/superuser DDL accounts. For single-role demos, the app-layer enforcement shipped by default is sufficient.

## 7. Optional Postgres upgrades (add-yourself)

These are documented patterns, not shipped defaults, and are intentionally _not_ wired into v0.1 (see `CHANGELOG.md` [Unreleased]):

### JSONB metadata

Change `audit_log.metadata_json` (and/or a new `memberships.metadata` column) to `jsonb`, then write objects directly instead of `JSON.stringify`:

```ts
// schema.ts
metadataJson: jsonb('metadata_json').$type<Record<string, unknown>>(),
// audit writer — pass the object, not a string
metadataJson: entry.metadata ?? null,
```

You get document queries: `WHERE metadata_json @> '{"plan":"pro"}'` with a GIN index if you query it often.

### Full-text search over the audit log

Postgres's native `tsvector` needs no external service:

```sql
ALTER TABLE audit_log ADD COLUMN search tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(action,'') || ' ' || coalesce(metadata_json,''))) STORED;
CREATE INDEX audit_log_search_idx ON audit_log USING GIN (search);

-- query
SELECT * FROM audit_log
WHERE search @@ plainto_tsquery('simple', 'ownership.transferred');
```

### Read replicas / write splitting

Drizzle supports separate handles for reads and writes:

```ts
// db/index.ts
const write = postgres(process.env.DATABASE_URL!);
const read = postgres(process.env.REPLICA_DATABASE_URL! ?? process.env.DATABASE_URL!);
export const db = drizzle(write, { schema });
export const readDb = drizzle(read, { schema });
```

Route reads that tolerate replication lag use `readDb`; every mutating service keeps using `db`. Unchanged services, new handles.
