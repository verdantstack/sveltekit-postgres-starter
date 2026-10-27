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
    // Whole-run guard: acquire a session-level advisory lock on the test database
    // BEFORE any file is collected. `fileParallelism: false` only serialises files
    // inside one process, so without this a second `npm test` interleaves its
    // truncations with the first and both suites fail with a wall of foreign-key
    // violations that look exactly like a broken migration. Failing here instead
    // aborts the run with one clear sentence. See tests/helpers/test-db-guard.ts.
    globalSetup: ['tests/helpers/global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/server/**/*.ts'],
      exclude: [
        'src/lib/server/db/schema.ts',
        'src/lib/server/db/index.ts',
        'src/lib/server/billing/index.ts',
        // Process bootstrap only — it connects to Postgres and hands off to stdio.ts,
        // which is covered in-process. A spawned child is invisible to v8 coverage,
        // so its behaviour is proven by the spawn test in tests/mcp.test.ts instead.
        'src/lib/server/mcp/cli.ts',
        'src/lib/server/email/index.ts',
        'src/lib/server/services/mfa.ts',
        'src/lib/server/services/oauth.ts',
        'src/lib/server/services/email-verification.ts',
        'src/lib/server/billing/stripe.ts',
        'src/lib/server/email/resend.ts',
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
