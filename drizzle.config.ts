import { defineConfig } from 'drizzle-kit';

export default {
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // drizzle-kit loads `.env`; falls back to the local docker-compose default.
    url:
      process.env.DATABASE_URL ||
      'postgres://verdantstack:verdantstack@localhost:5433/verdantstack',
  },
} satisfies import('drizzle-kit').Config;
