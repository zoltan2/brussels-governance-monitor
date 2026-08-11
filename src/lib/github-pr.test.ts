// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPrFiles,
  getCheckState,
  requiredChecksFor,
  listContentPrs,
  publishablePrProblem,
  normalizeRepo,
} from './github-pr';

const REPO = 'zoltan2/brussels-governance-monitor';

/** Une PR de veille conforme, dont chaque test ne casse qu'un aspect. */
function pr(over: Partial<{ headRepo: string | null; branch: string; baseRef: string }> = {}) {
  return {
    headRepo: REPO,
    branch: 'content/veille-2026-08-09',
    baseRef: 'main',
    ...over,
  };
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.GITHUB_TOKEN = 'jeton-de-test';
  process.env.GITHUB_REPO = 'zoltan2/brussels-governance-monitor';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function page(count: number, prefix: string): unknown[] {
  return Array.from({ length: count }, (_, i) => ({
    filename: `${prefix}/f${i}.mdx`,
    status: 'modified',
    additions: 1,
    deletions: 0,
  }));
}

describe('normalizeRepo', () => {
  // Chacune de ces formes s'écrit dans un `.env` sans avoir l'air fausse, et
  // comparée brute elle ferait à la fois disparaître l'écran (« Rien à
  // publier ») et refuser la fusion, sans qu'aucun symptôme ne désigne la
  // cause.
  it('ramène les formes courantes à owner/name', () => {
    for (const forme of [
      'zoltan2/brussels-governance-monitor',
      'Zoltan2/Brussels-Governance-Monitor',
      'https://github.com/zoltan2/brussels-governance-monitor',
      'https://github.com/zoltan2/brussels-governance-monitor.git',
      'zoltan2/brussels-governance-monitor/',
      '  zoltan2/brussels-governance-monitor  ',
    ]) {
      expect(normalizeRepo(forme)).toBe(REPO);
    }
  });
});

describe('publishablePrProblem', () => {
  // Le contrat « d'où vient cette PR », lu par la liste, la page-décision et
  // la route de fusion. Toute la défense reposait sur de la lecture.
  it('laisse passer une PR de veille conforme', () => {
    expect(publishablePrProblem(pr(), REPO)).toBeNull();
  });

  it('refuse une PR de fork, quel que soit le nom de branche choisi', () => {
    // La garde décisive : un inconnu nomme sa branche `content/veille-…` et
    // franchit toute garde qui ne regarde que le nom.
    expect(publishablePrProblem(pr({ headRepo: 'inconnu/fork' }), REPO)).toBe(
      'PR extérieure au dépôt',
    );
  });

  it('refuse une PR dont le fork a été supprimé', () => {
    // `head.repo` vaut alors `null` : sans garde explicite, `null?.toLowerCase()`
    // rend `undefined` et une comparaison mal écrite laisserait passer.
    expect(publishablePrProblem(pr({ headRepo: null }), REPO)).toBe(
      'PR extérieure au dépôt',
    );
  });

  it('refuse un mauvais préfixe de branche', () => {
    expect(publishablePrProblem(pr({ branch: 'feat/quelque-chose' }), REPO)).toBe(
      'Branche hors périmètre',
    );
    // Le préfixe réel est `content/veille-`, pas `veille/`.
    expect(publishablePrProblem(pr({ branch: 'veille/2026-08-09' }), REPO)).toBe(
      'Branche hors périmètre',
    );
  });

  it('refuse une branche cible autre que main', () => {
    expect(publishablePrProblem(pr({ baseRef: 'production' }), REPO)).toBe(
      'Branche cible inattendue',
    );
  });

  it('accepte les formes non normalisées de GITHUB_REPO', () => {
    // Une brute comparée à une normalisée refuserait notre propre PR.
    expect(
      publishablePrProblem(pr(), 'https://github.com/Zoltan2/Brussels-Governance-Monitor.git'),
    ).toBeNull();
  });
});

describe('listContentPrs', () => {
  function rawPr(over: Record<string, unknown> = {}) {
    return {
      number: 400,
      title: 'veille',
      body: '',
      created_at: '2026-08-09T06:00:00Z',
      merged_at: null,
      head: { ref: 'content/veille-2026-08-09', sha: 'a'.repeat(40), repo: { full_name: REPO } },
      base: { sha: 'b'.repeat(40), ref: 'main' },
      ...over,
    };
  }

  function stub(list: unknown[]) {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify(list), { status: 200 }),
    ) as unknown as typeof fetch;
  }

  it('garde une PR de veille conforme', async () => {
    stub([rawPr()]);
    expect(await listContentPrs()).toHaveLength(1);
  });

  it('écarte une PR de fork au nom de branche pourtant crédible', async () => {
    stub([
      rawPr({
        number: 401,
        head: {
          ref: 'content/veille-2026-08-16',
          sha: 'c'.repeat(40),
          repo: { full_name: 'inconnu/fork' },
        },
      }),
    ]);
    expect(await listContentPrs()).toEqual([]);
  });

  it('écarte une PR dont le fork a été supprimé', async () => {
    stub([
      rawPr({ head: { ref: 'content/veille-2026-08-16', sha: 'c'.repeat(40), repo: null } }),
    ]);
    expect(await listContentPrs()).toEqual([]);
  });

  it('écarte un mauvais préfixe de branche', async () => {
    stub([rawPr({ head: { ref: 'feat/x', sha: 'c'.repeat(40), repo: { full_name: REPO } } })]);
    expect(await listContentPrs()).toEqual([]);
  });

  it('écarte une branche cible autre que main', async () => {
    stub([rawPr({ base: { sha: 'b'.repeat(40), ref: 'production' } })]);
    expect(await listContentPrs()).toEqual([]);
  });

  it('reste insensible à la casse de GITHUB_REPO', async () => {
    process.env.GITHUB_REPO = 'https://github.com/Zoltan2/Brussels-Governance-Monitor.git';
    stub([rawPr()]);
    expect(await listContentPrs()).toHaveLength(1);
  });
});

describe('getPrFiles', () => {
  it('agrège les pages jusqu\'à une page incomplète', async () => {
    const pages = [page(100, 'a'), page(100, 'b'), page(7, 'c')];
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const n = Number(new URL(String(url)).searchParams.get('page'));
      return new Response(JSON.stringify(pages[n - 1] ?? []), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await getPrFiles(1);
    expect(result.files).toHaveLength(207);
    expect(result.truncated).toBe(false);
  });

  it('signale la troncature quand le plafond est atteint', async () => {
    // Toujours des pages pleines : on ne sait jamais si c'est fini.
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify(page(100, 'x')), { status: 200 }),
    ) as unknown as typeof fetch;

    const result = await getPrFiles(1);
    expect(result.truncated).toBe(true);
  });
});

describe('requiredChecksFor', () => {
  // Noms de JOB relevés dans .github/workflows/ le 2026-08-11. C'est ce que
  // rend l'API check-runs, et deux noms devinés auraient bloqué à vie.
  it('exige toujours le contrôle sans filtre de chemin', () => {
    expect(requiredChecksFor(['data/radar.json'])).toEqual(['Lint, Typecheck & Build']);
  });

  it('ajoute les trois contrôles conditionnels dès qu\'il y a du contenu', () => {
    expect(requiredChecksFor(['content/domain-cards/x.fr.mdx'])).toEqual([
      'Lint, Typecheck & Build',
      'Editorial content checks',
      'Quiz pool checks',
      'Pagefind index up to date',
    ]);
  });

  it('exige pagefind sans le contrôle éditorial pour une traduction seule', () => {
    expect(requiredChecksFor(['messages/fr.json'])).toEqual([
      'Lint, Typecheck & Build',
      'Pagefind index up to date',
    ]);
  });
});

describe('getCheckState', () => {
  it('range les contrôles par état et nomme ceux qui échouent', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            check_runs: [
              { name: 'Lint, Typecheck & Build', status: 'completed', conclusion: 'success' },
              { name: 'Pagefind freshness', status: 'completed', conclusion: 'failure' },
              { name: 'Content lint', status: 'in_progress', conclusion: null },
            ],
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const state = await getCheckState('abc1234', ['data/radar.json']);
    expect(state.passed).toBe(1);
    expect(state.pending).toBe(1);
    expect(state.failed).toEqual(['Pagefind freshness']);
    expect(state.total).toBe(3);
  });

  it('compte « neutral » et « skipped » comme réussis, pas comme échecs', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            check_runs: [
              { name: 'A', status: 'completed', conclusion: 'neutral' },
              { name: 'B', status: 'completed', conclusion: 'skipped' },
            ],
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const state = await getCheckState('abc1234', ['data/radar.json']);
    expect(state.failed).toEqual([]);
    expect(state.passed).toBe(2);
    expect(state.missing).toEqual(['Lint, Typecheck & Build']);
  });
});
