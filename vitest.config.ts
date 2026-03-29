import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Workspace-aware: discover tests across all packages
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**',
    ],

    // Timeouts
    testTimeout: 30_000,
    hookTimeout: 15_000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'json-summary', 'cobertura'],
      reportsDirectory: './coverage',
      include: [
        'packages/*/src/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
        '**/types.ts',
        '**/node_modules/**',
        '**/dist/**',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 75,
        statements: 80,
      },
    },

    // Environment
    environment: 'node',

    // Reporter
    reporters: ['default'],

    // Pool — use threads for isolation
    pool: 'threads',
  },
});
