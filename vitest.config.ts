import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // Each file connects to Postgres and (via createTestDb) truncates the shared
    // tracked tables; run files sequentially so a shared test database is never
    // contended between workers.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/server/**/*.ts'],
      exclude: ['src/lib/server/db/schema.ts', 'src/lib/server/db/index.ts', 'src/lib/server/billing/index.ts'],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
