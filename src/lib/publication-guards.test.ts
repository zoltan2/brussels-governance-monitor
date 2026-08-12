// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { prRefusal, filesRefusal, checksRefusal } from './publication-guards';
import type { CheckState } from './github-pr';

const REPO = 'zoltan2/brussels-governance-monitor';
const SHA = 'a'.repeat(40);

/** Une PR de veille conforme, dont chaque test ne casse qu'un aspect. */
function pr(
  over: Partial<{ headRepo: string | null; branch: string; baseRef: string; sha: string }> = {},
) {
  return {
    headRepo: REPO,
    branch: 'content/veille-2026-08-09',
    baseRef: 'main',
    sha: SHA,
    ...over,
  };
}

describe('prRefusal', () => {
  it('laisse passer une PR de veille conforme', () => {
    expect(prRefusal(pr(), SHA, REPO)).toBeNull();
  });

  it('refuse une PR de fork, quel que soit le nom de branche choisi', () => {
    expect(prRefusal(pr({ headRepo: 'inconnu/fork' }), SHA, REPO)).toEqual({
      status: 403,
      error: 'PR extérieure au dépôt',
    });
  });

  it('refuse une PR dont le fork a été supprimé', () => {
    expect(prRefusal(pr({ headRepo: null }), SHA, REPO)).toEqual({
      status: 403,
      error: 'PR extérieure au dépôt',
    });
  });

  it('refuse un mauvais préfixe de branche', () => {
    expect(prRefusal(pr({ branch: 'feat/quelque-chose' }), SHA, REPO)).toEqual({
      status: 403,
      error: 'Branche hors périmètre',
    });
  });

  it('refuse une branche cible autre que main', () => {
    expect(prRefusal(pr({ baseRef: 'production' }), SHA, REPO)).toEqual({
      status: 403,
      error: 'Branche cible inattendue',
    });
  });

  it('refuse un sha ayant bougé depuis l\'affichage', () => {
    expect(prRefusal(pr(), 'b'.repeat(40), REPO)).toEqual({
      status: 409,
      error: 'La branche a changé depuis l\'affichage. Recharger la page.',
    });
  });
});

describe('filesRefusal', () => {
  it('bloque une liste tronquée, même avec des fichiers conformes', () => {
    // La troncature doit primer sur le contenu de la liste : GitHub trie par
    // chemin, et `src/` arrive après le millier de fichiers pagefind.
    expect(filesRefusal(['content/x.fr.mdx'], true)).toEqual({
      status: 422,
      error: 'Liste de fichiers incomplète, publication refusée',
    });
  });

  it('refuse un fichier hors périmètre', () => {
    expect(filesRefusal(['content/x.fr.mdx', 'src/app/page.tsx'], false)).toEqual({
      status: 403,
      error: 'Fichiers hors périmètre : src/app/page.tsx',
    });
  });

  it('refuse une liste vide', () => {
    expect(filesRefusal([], false)).toEqual({
      status: 403,
      error: 'La PR ne touche aucun fichier',
    });
  });

  it('laisse passer un ensemble conforme', () => {
    expect(
      filesRefusal(
        ['content/domain-cards/x.fr.mdx', 'data/radar.json', 'public/pagefind/pagefind-entry.json'],
        false,
      ),
    ).toBeNull();
  });
});

/** Un état de contrôles entièrement vert, dont chaque test ne casse qu'un aspect. */
function checks(over: Partial<CheckState> = {}): CheckState {
  return {
    passed: 1,
    pending: 0,
    failed: [],
    total: 1,
    missing: [],
    ...over,
  };
}

describe('checksRefusal', () => {
  it('refuse un contrôle en échec, en le nommant', () => {
    expect(checksRefusal(checks({ failed: ['Lint, Typecheck & Build'] }))).toEqual({
      status: 409,
      error: 'Contrôles non satisfaits : Lint, Typecheck & Build',
    });
  });

  it('refuse un contrôle requis manquant, en le nommant', () => {
    expect(checksRefusal(checks({ missing: ['Pagefind index up to date'] }))).toEqual({
      status: 409,
      error: 'Contrôles non satisfaits : Pagefind index up to date',
    });
  });

  it('refuse des contrôles en cours sans rien en échec, en nommant leur nombre', () => {
    // M15 : `[...failed, ...missing].join(', ')` sans repli rendait
    // « Contrôles non satisfaits : » suivi du vide dès qu'aucun contrôle
    // n'était nommément en échec ou manquant — uniquement en cours. C'est le
    // défaut que ce fichier corrige ; le message doit nommer le nombre de
    // contrôles en cours plutôt que se taire.
    expect(checksRefusal(checks({ pending: 2, passed: 0, total: 2 }))).toEqual({
      status: 409,
      error: 'Contrôles non satisfaits : 2 en cours',
    });
  });

  it('laisse passer un état entièrement vert', () => {
    expect(checksRefusal(checks())).toBeNull();
  });
});
