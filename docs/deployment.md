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

When using a pooler, keep `PG_MAX_CONNECTIONS` roughly equal to the pooler's `default_pool_size` so you don't exhaust server connections.

## 6. RLS hardening (optional, defense-in-depth)

Tenancy is enforced in the application layer by default. To also enforce isolation at the database level:

```mermaid
flowchart TD
    subgraph SETUP["RLS Setup"]
        direction TB
        S1["1. Create low-privilege<br/>app_rw role"]
        S2["2. Apply policies<br/>rls/0010_rls_policies.sql"]
        S3["3. Set GUC in hooks.server.ts<br/>SET LOCAL app.current_user_id"]
        S1 --> S2 --> S3
    end

    subgraph ENFORCE["Runtime Enforcement"]
        direction TB
        REQ["Request arrives"] --> TXN["BEGIN"]
        TXN --> GUC["SET LOCAL<br/>app.current_user_id"]
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
2. **Apply the policies** (they `ENABLE` + `FORCE` RLS, so tables are fail-closed):
   ```bash
   psql "$DATABASE_URL" -f rls/0010_rls_policies.sql
   ```
3. **Set per-request identity** in a transaction so the GUC rolls back with the request (`src/hooks.server.ts`):
   ```ts
   const db = await getDb();
   await db.execute(sql`BEGIN`);
   await db.execute(sql`SET LOCAL app.current_user_id = ${locals.user?.id ?? null}`);
   // ... resolve the request ...
   await db.execute(sql`COMMIT`);
   ```
   Any path that forgets the GUC returns **no rows** (fail-closed) — which is exactly the property you want from a safety net.

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
