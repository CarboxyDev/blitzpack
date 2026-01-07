import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedConfig } from '../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: '@repo/api-unit',
      include: ['src/**/*.spec.ts'],
      globals: true,
      root: './',
    },
    plugins: [tsconfigPaths()],
  })
);
