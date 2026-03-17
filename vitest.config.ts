import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: 'packages/core',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'cli',
          root: 'packages/cli',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'ui',
          root: 'packages/ui',
          include: ['src/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
    coverage: {
      exclude: [
        '**/dist/**',
        '**/node_modules/**',
        'packages/cli/src/index.ts',
        'packages/ui/**',
        '**/index.ts',
      ],
    },
  },
});
