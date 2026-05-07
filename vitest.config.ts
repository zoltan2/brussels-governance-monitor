import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      // axe-core a besoin de la couverture ARIA complète de jsdom
      // (spec phase 2e §5.2 : pas happy-dom, ARIA partiel)
      ['src/components/**/*.render.test.tsx', 'jsdom'],
      // Future : tests snapshot rapides sans axe peuvent utiliser happy-dom
      // ['src/components/**/*.snapshot.test.tsx', 'happy-dom'],
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
