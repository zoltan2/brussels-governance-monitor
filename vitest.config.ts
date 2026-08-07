import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // Sans cela, Vite refuse l'import dynamique de `/pagefind/pagefind.js`
  // (fichier de `public/`) présent dans `search.tsx`.
  publicDir: false,
  test: {
    globals: true,
    // Environnement par défaut : node. Les render-tests qui ont besoin de la
    // couverture ARIA complète de jsdom (axe-core, spec phase 2e §5.2 : pas
    // happy-dom, ARIA partiel) déclarent `// @vitest-environment jsdom` en tête
    // de fichier — `environmentMatchGlobs` a été retiré dans Vitest 4.
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Généré au build dans `public/`, donc inexistant en test — et Vite
      // refuse d'importer un fichier de `public/`.
      '/pagefind/pagefind.js': resolve(__dirname, 'src/test/pagefind-stub.ts'),
    },
  },
});
