import { describe, it, expect, vi } from 'vitest';
import {
  commitReviewFiles,
  listOpenReviewPrs,
  mergeReviewPr,
  reviewCheckState,
  type GitHubContext,
} from './github-commit';

/** Faux GitHub : rend une réponse par appel et enregistre tout ce qui part. */
function fakeGitHub(responses: Record<string, unknown>) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    calls.push({ url: u, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const key = Object.keys(responses).find((k) => u.includes(k) && (k !== '/git/ref/heads/main' || u.endsWith(k)));
    return {
      ok: true,
      status: 200,
      json: async () => responses[key ?? ''] ?? {},
      text: async () => '',
    } as unknown as Response;
  });
  const ctx: GitHubContext = { repo: 'org/repo', token: 'jeton-de-test', fetchImpl: fetchImpl as never };
  return { ctx, calls };
}

const RESPONSES = {
  '/git/ref/heads/main': { object: { sha: 'base-sha' } },
  '/git/commits/base-sha': { tree: { sha: 'base-tree' } },
  '/git/blobs': { sha: 'blob-sha' },
  '/git/trees': { sha: 'tree-sha' },
  '/git/commits': { sha: 'commit-sha' },
  '/git/refs': {},
};

const FILES = [
  { path: 'data/quiz-review-state.json', content: '{}' },
  { path: 'public/quiz-data-fr.json', content: '{}' },
];

describe('commitReviewFiles', () => {
  it('écrit un seul commit pour tous les fichiers du lot', async () => {
    const { ctx, calls } = fakeGitHub(RESPONSES);
    const res = await commitReviewFiles(ctx, {
      branch: 'review/quiz-2026-08-25',
      message: 'content(quiz): relecture — 2 approuvée(s), 0 retirée(s)',
      files: FILES,
    });
    expect(res.commitSha).toBe('commit-sha');
    expect(calls.filter((c) => c.url.includes('/git/commits') && c.method === 'POST')).toHaveLength(1);
  });

  /** La v1 de cette page poussait sur `main`, ce qui contournait content-lint,
   *  seul garde éditorial du dépôt sur les pools de quiz. */
  it('ne met jamais à jour la référence main', async () => {
    const { ctx, calls } = fakeGitHub(RESPONSES);
    await commitReviewFiles(ctx, { branch: 'review/quiz-2026-08-25', message: 'm', files: FILES });
    const refWrites = calls.filter((c) => c.method === 'POST' && c.url.endsWith('/git/refs'));
    expect(refWrites).toHaveLength(1);
    expect((refWrites[0]!.body as { ref: string }).ref).toBe('refs/heads/review/quiz-2026-08-25');
  });

  it('ne force jamais la mise à jour de la référence', async () => {
    const { ctx, calls } = fakeGitHub(RESPONSES);
    await commitReviewFiles(ctx, { branch: 'review/quiz-2026-08-25', message: 'm', files: FILES });
    for (const c of calls) {
      expect(JSON.stringify(c.body ?? {})).not.toContain('force');
    }
  });

  it('refuse une branche qui ne porte pas le préfixe de relecture', async () => {
    const { ctx, calls } = fakeGitHub(RESPONSES);
    await expect(
      commitReviewFiles(ctx, { branch: 'main', message: 'm', files: FILES }),
    ).rejects.toThrow(/Branche interdite/);
    expect(calls, 'aucun appel réseau ne doit partir').toHaveLength(0);
  });

  it('refuse un chemin hors des cinq autorisés, sans rien envoyer', async () => {
    const { ctx, calls } = fakeGitHub(RESPONSES);
    await expect(
      commitReviewFiles(ctx, {
        branch: 'review/quiz-2026-08-25',
        message: 'm',
        files: [{ path: '.github/workflows/deploy-image.yml', content: 'x' }],
      }),
    ).rejects.toThrow(/Chemins interdits/);
    expect(calls).toHaveLength(0);
  });
});

describe('listOpenReviewPrs', () => {
  it('ne rend que les PR de relecture, jamais celles de veille', async () => {
    const { ctx } = fakeGitHub({
      '/pulls': [
        { number: 1, head: { ref: 'review/quiz-2026-08-25', sha: 'a', repo: { full_name: 'org/repo' } }, base: { ref: 'main' }, created_at: '2026-08-25' },
        { number: 2, head: { ref: 'content/veille-2026-08-24', sha: 'b', repo: { full_name: 'org/repo' } }, base: { ref: 'main' }, created_at: '2026-08-24' },
      ],
    });
    const prs = await listOpenReviewPrs(ctx);
    expect(prs.map((p) => p.number)).toEqual([1]);
  });

  it('rend un dépôt d’origine nul quand le fork a été supprimé', async () => {
    const { ctx } = fakeGitHub({
      '/pulls': [
        { number: 3, head: { ref: 'review/quiz-x', sha: 'c', repo: null }, base: { ref: 'main' }, created_at: '2026-08-25' },
      ],
    });
    expect((await listOpenReviewPrs(ctx))[0]!.headRepo).toBeNull();
  });
});

describe('mergeReviewPr', () => {
  it('fusionne en squash sur le sha attendu', async () => {
    const { ctx, calls } = fakeGitHub({ '/merge': { merged: true } });
    await mergeReviewPr(ctx, { number: 42, sha: 'tete-attendue' });
    const call = calls.find((c) => c.method === 'PUT')!;
    expect(call.url).toContain('/pulls/42/merge');
    expect(call.body).toMatchObject({ merge_method: 'squash', sha: 'tete-attendue' });
  });
});

describe('reviewCheckState', () => {
  const SHA = 'a'.repeat(40);

  /** GitHub a retiré la permission « Checks » des jetons fine-grained ; seules
   *  les GitHub Apps lisent encore cette API, et le refus est un 403 même sur
   *  un dépôt public. Lire `check-runs` condamnerait donc la fusion à un 502
   *  permanent dès que la page tourne avec un jeton cantonné à ce dépôt. */
  it('interroge l’API Actions, jamais l’API Checks', async () => {
    const { ctx, calls } = fakeGitHub({ '/actions/runs': { workflow_runs: [] } });
    await reviewCheckState(ctx, SHA);
    expect(calls.some((c) => c.url.includes('check-runs'))).toBe(false);
    expect(calls[0]!.url).toContain(`/actions/runs?head_sha=${SHA}`);
  });

  it('compte un workflow terminé en succès', async () => {
    const { ctx } = fakeGitHub({
      '/actions/runs': { workflow_runs: [{ name: 'CI', status: 'completed', conclusion: 'success' }] },
    });
    expect(await reviewCheckState(ctx, SHA)).toMatchObject({ passed: 1, pending: 0, failed: [] });
  });

  it('compte un workflow non terminé comme en cours', async () => {
    const { ctx } = fakeGitHub({
      '/actions/runs': { workflow_runs: [{ name: 'CI', status: 'in_progress', conclusion: null }] },
    });
    expect(await reviewCheckState(ctx, SHA)).toMatchObject({ pending: 1, failed: [] });
  });

  it('nomme le workflow en échec', async () => {
    const { ctx } = fakeGitHub({
      '/actions/runs': {
        workflow_runs: [{ name: 'Content lint', status: 'completed', conclusion: 'failure' }],
      },
    });
    expect((await reviewCheckState(ctx, SHA)).failed).toEqual(['Content lint']);
  });

  /** `content-lint.yml` porte un filtre `paths:` : une relecture qui ne
   *  toucherait pas les pools rendrait un run « skipped », qui n’est pas un
   *  échec. */
  it('ne tient ni skipped ni neutral pour un échec', async () => {
    const { ctx } = fakeGitHub({
      '/actions/runs': {
        workflow_runs: [
          { name: 'Content lint', status: 'completed', conclusion: 'skipped' },
          { name: 'Pagefind', status: 'completed', conclusion: 'neutral' },
        ],
      },
    });
    expect((await reviewCheckState(ctx, SHA)).failed).toEqual([]);
  });

  /** Sans ce compte, une fusion demandée avant que le premier workflow ne
   *  soit inscrit lit zéro échec comme un feu vert. */
  it('rend un total nul quand aucun run n’existe pour ce sha', async () => {
    const { ctx } = fakeGitHub({ '/actions/runs': { workflow_runs: [] } });
    expect((await reviewCheckState(ctx, SHA)).total).toBe(0);
  });
});
