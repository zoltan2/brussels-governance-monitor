// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPrFiles, getCheckState, requiredChecksFor } from './github-pr';

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

  it('ajoute les deux contrôles conditionnels dès qu\'il y a du contenu', () => {
    expect(requiredChecksFor(['content/domain-cards/x.fr.mdx'])).toEqual([
      'Lint, Typecheck & Build',
      'Editorial content checks',
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
