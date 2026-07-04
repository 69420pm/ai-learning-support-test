import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import webConfig from './apps/web/vitest.config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'tsconfig',
          root: path.resolve(currentDir, 'packages/tsconfig'),
          exclude: [...configDefaults.exclude, '**/dist/**'],
        },
      },
      {
        test: {
          name: 'shared',
          root: path.resolve(currentDir, 'packages/shared'),
          exclude: [...configDefaults.exclude, '**/dist/**'],
        },
      },
      {
        test: {
          name: 'infrastructure',
          root: path.resolve(currentDir, 'packages/infrastructure'),
          exclude: [...configDefaults.exclude, '**/dist/**'],
        },
      },
      {
        test: {
          name: 'core',
          root: path.resolve(currentDir, 'packages/core'),
          exclude: [...configDefaults.exclude, '**/dist/**'],
        },
      },
      {
        ...webConfig,
        test: {
          ...webConfig.test,
          name: 'web',
          root: path.resolve(currentDir, 'apps/web'),
          exclude: [...configDefaults.exclude, '**/dist/**'],
        },
      },
    ],
  },
});
