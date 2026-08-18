import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['*.test.ts', 'tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@fivem-ai/shared': path.resolve(__dirname, 'src/index.ts'),
      '@fivem-ai/shared/protocol': path.resolve(__dirname, 'src/protocol/index.ts'),
    },
  },
});
