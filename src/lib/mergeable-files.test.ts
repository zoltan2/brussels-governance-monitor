// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  isMergeableFileSet,
  fileSetRefusal,
  ALLOWED_PREFIXES,
  ALLOWED_DATA_FILES,
} from '@/lib/mergeable-files';

describe('isMergeableFileSet', () => {
  it('accepte ce qu\'une vraie veille touche, vérifié sur la PR #387', () => {
    expect(
      isMergeableFileSet([
        'content/domain-cards/x.fr.mdx',
        'content/dossiers/y.fr.mdx',
        'messages/fr.json',
        'data/radar.json',
        'data/commitments.json',
        'data/changelog.json',
      ]),
    ).toBe(true);
  });

  it('accepte les formes de la PR de veille réelle 2026-08-09, hors pagefind', () => {
    // Formes relevées sur `git diff --name-only
    // origin/main...origin/content/veille-2026-08-09` : 36 fiches de contenu
    // en quatre langues, 3 fichiers data (et 254 artefacts pagefind, qu'une
    // veille ne produit plus depuis #461). Une liste blanche qui se durcit
    // sans passer ici bloquerait toute veille.
    const reelles = [
      'content/commune-cards/schaerbeek.fr.mdx',
      'content/commune-cards/schaerbeek.nl.mdx',
      'content/commune-cards/schaerbeek.en.mdx',
      'content/commune-cards/schaerbeek.de.mdx',
      'content/domain-cards/mobility.fr.mdx',
      'content/dossiers/vice-gouverneur.fr.mdx',
      'data/radar.json',
      'data/commitments.json',
      'data/changelog.json',
    ];
    expect(isMergeableFileSet(reelles)).toBe(true);
    expect(fileSetRefusal(reelles)).toBeNull();
  });

  it('refuse du code applicatif', () => {
    expect(isMergeableFileSet(['content/x.fr.mdx', 'src/app/page.tsx'])).toBe(false);
  });

  it('refuse un workflow', () => {
    expect(isMergeableFileSet(['.github/workflows/deploy-image.yml'])).toBe(false);
  });

  it('refuse le brouillon du digest, qui pilote l\'email des abonnés', () => {
    expect(isMergeableFileSet(['data/pending-digest.json'])).toBe(false);
  });

  it('refuse tout autre fichier sous data/', () => {
    expect(isMergeableFileSet(['data/watch-hashes.json'])).toBe(false);
    expect(isMergeableFileSet(['data/quiz/questions.json'])).toBe(false);
  });

  it('refuse tout public/pagefind/ depuis #461, artefacts légitimes compris', () => {
    // L'index est gitignoré et généré par l'image Docker : une PR qui y
    // touche est anormale. `search.tsx` importe `/pagefind/pagefind.js`, un
    // `.js` servi là s'exécuterait sur l'origine principale.
    for (const p of [
      'public/pagefind/evil.js',
      'public/pagefind/pagefind.js',
      'public/pagefind/pagefind-entry.json',
      'public/pagefind/fragment/fr_abc123.pf_fragment',
      'public/pagefind/wasm.fr.pagefind',
    ]) {
      expect(isMergeableFileSet([p])).toBe(false);
    }
    expect(fileSetRefusal(['content/x.fr.mdx', 'public/pagefind/pagefind.js'])).toContain(
      'public/pagefind/pagefind.js',
    );
  });

  it('restreint messages/ au JSON, et à la racine', () => {
    // Une régression sur cette ligne laissait passer `messages/evil.js`.
    expect(isMergeableFileSet(['messages/evil.js'])).toBe(false);
    expect(isMergeableFileSet(['messages/sub/fr.json'])).toBe(false);
    expect(isMergeableFileSet(['messages/fr.json'])).toBe(true);
  });

  it('compare les chemins en tenant compte de la casse', () => {
    // Une comparaison insensible à la casse laissait passer d'autres arbres.
    expect(isMergeableFileSet(['Content/domain-cards/x.fr.mdx'])).toBe(false);
    expect(isMergeableFileSet(['SRC/app/page.tsx'])).toBe(false);
  });

  it('refuse une remontée de chemin', () => {
    expect(isMergeableFileSet(['content/../src/app/page.tsx'])).toBe(false);
  });

  it('refuse un ensemble vide', () => {
    expect(isMergeableFileSet([])).toBe(false);
  });

  it('la liste des préfixes ne contient ni data/ ni .github/', () => {
    expect(ALLOWED_PREFIXES).not.toContain('data/');
    expect(ALLOWED_PREFIXES.some((p) => p.startsWith('.github'))).toBe(false);
  });

  it('les fichiers data/ autorisés sont nommés un par un, jamais par préfixe', () => {
    expect(ALLOWED_DATA_FILES).not.toContain('data/pending-digest.json');
    expect(ALLOWED_DATA_FILES.every((f) => f.endsWith('.json'))).toBe(true);
  });
});

describe('fileSetRefusal', () => {
  // Cette fonction est lue à DEUX endroits — la page-décision et la route de
  // fusion. Un écran qui dit « Prêt à publier » là où la route répond 403
  // est le défaut qu'elle existe pour fermer.
  it('ne refuse rien sur ce qu\'une vraie veille touche', () => {
    expect(
      fileSetRefusal([
        'content/domain-cards/x.fr.mdx',
        'messages/fr.json',
        'data/radar.json',
      ]),
    ).toBeNull();
  });

  it('nomme le fichier hors périmètre', () => {
    const message = fileSetRefusal(['content/x.fr.mdx', 'src/app/page.tsx']);
    expect(message).toMatch(/hors périmètre/i);
    expect(message).toContain('src/app/page.tsx');
    // Le fichier légitime n'est pas accusé.
    expect(message).not.toContain('content/x.fr.mdx');
  });

  it('cite cinq coupables au plus et compte le reste', () => {
    const paths = Array.from({ length: 9 }, (_, i) => `src/a${i}.ts`);
    const message = fileSetRefusal(paths);
    expect(message).toContain('src/a4.ts');
    expect(message).not.toContain('src/a5.ts');
    expect(message).toContain('et 4 autres');
  });

  it('refuse un ensemble vide sans prétendre nommer un fichier', () => {
    expect(fileSetRefusal([])).toBe('La PR ne touche aucun fichier');
  });

  it('dit la même chose qu\'isMergeableFileSet, jamais l\'inverse', () => {
    const cas = [
      ['content/x.fr.mdx'],
      ['data/pending-digest.json'],
      ['public/pagefind/evil.js'],
      [],
      ['messages/fr.json', 'src/app/page.tsx'],
    ];
    for (const paths of cas) {
      expect(fileSetRefusal(paths) === null).toBe(isMergeableFileSet(paths));
    }
  });
});
