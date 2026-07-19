import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Component tests opt into jsdom via a `// @vitest-environment jsdom`
    // docblock at the top of the file; everything else stays on the
    // faster 'node' environment.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/lib/**', 'src/app/api/v1/**', 'src/components/**'],
    },
  },
});
