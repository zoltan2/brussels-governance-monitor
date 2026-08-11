// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  isMergeableFileSet,
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
        'public/pagefind/pagefind-entry.json',
        'data/radar.json',
        'data/commitments.json',
        'data/changelog.json',
      ]),
    ).toBe(true);
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

  it('refuse un JavaScript arbitraire sous public/pagefind', () => {
    // `search.tsx:53` importe `/pagefind/pagefind.js` dès l'ouverture de la
    // recherche : un `.js` arbitraire ici s'exécute sur l'origine principale.
    expect(isMergeableFileSet(['public/pagefind/evil.js'])).toBe(false);
    expect(isMergeableFileSet(['public/pagefind/sub/evil.js'])).toBe(false);
  });

  it('accepte les artefacts pagefind légitimes, nommés un par un', () => {
    expect(
      isMergeableFileSet([
        'public/pagefind/pagefind.js',
        'public/pagefind/pagefind-ui.css',
        'public/pagefind/pagefind-entry.json',
        'public/pagefind/fragment/fr_abc123.pf_fragment',
        'public/pagefind/wasm.fr.pagefind',
      ]),
    ).toBe(true);
  });

  it('refuse un JSON arbitraire sous public/pagefind', () => {
    expect(isMergeableFileSet(['public/pagefind/evil.json'])).toBe(false);
  });

  it('refuse une extension composée sous public/pagefind', () => {
    // `.pagefind` en suffixe seul acceptait `evil.js.pagefind`.
    expect(isMergeableFileSet(['public/pagefind/evil.js.pagefind'])).toBe(false);
    expect(isMergeableFileSet(['public/pagefind/evil.pagefind'])).toBe(false);
    expect(isMergeableFileSet(['public/pagefind/wasm.fr.pagefind'])).toBe(true);
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
