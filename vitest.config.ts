import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
		environment: 'node',
		hookTimeout: 30_000,
		testTimeout: 30_000,
		// Each file connects to Postgres and (via createTestDb) truncates the shared
		// tracked tables; run files sequentially so a shared test database is never
		// contended between workers.
		fileParallelism: false
	}
});
