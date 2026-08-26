// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Écriture GitHub multi-fichiers, pour la page de relecture du quiz.
 *
 * Pourquoi un module à part plutôt qu'un ajout à `github.ts` ou
 * `github-pr.ts` : ces deux-là servent la publication de la veille. Leur
 * ajouter un mode reviendrait à modifier le chemin de publication du contenu
 * pour un besoin qui lui est étranger — le même élargissement de surface
 * partagée que l'on refuse pour `mergeable-files.ts`.
 *
 * L'API Contents n'écrit qu'un fichier par appel, donc un commit par fichier,
 * donc cinq déclencheurs de contrôles. Ce module passe par l'API Git Data :
 * blobs, arbre, commit, mise à jour de référence. Un seul commit, et jamais
 * d'instant où le compteur contredit l'état de relecture.
 *
 * La référence cible est toujours une branche de relecture, jamais `main`, et
 * la mise à jour n'est jamais forcée.
 */

import { QUIZ_REVIEW_BRANCH_PREFIX, QUIZ_REVIEW_PATHS, type CheckState } from './quiz-review-guards';

const API = 'https://api.github.com';

export type FetchLike = typeof fetch;

export interface GitHubContext {
  repo: string;
  token: string;
  fetchImpl?: FetchLike;
}

/**
 * Jeton de la page de relecture.
 *
 * `QUIZ_REVIEW_TOKEN` est un jeton fine-grained limité à ce dépôt. En son
 * absence, on retombe sur `GITHUB_TOKEN`, ce qui garde la page fonctionnelle
 * sans prétendre à une isolation qui n'existerait pas.
 */
export function reviewContext(fetchImpl?: FetchLike): GitHubContext {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.QUIZ_REVIEW_TOKEN || process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error('GITHUB_REPO et un jeton (QUIZ_REVIEW_TOKEN ou GITHUB_TOKEN) sont requis');
  }
  return { repo, token, fetchImpl };
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

async function call<T>(
  ctx: GitHubContext,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(`${API}/repos/${ctx.repo}${path}`, {
    method: init?.method ?? 'GET',
    headers: headers(ctx.token),
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    // Le corps de la réponse GitHub n'est pas renvoyé à l'appelant : il porte
    // le nom du dépôt, l'état du quota et la formulation des permissions
    // manquantes. Il part dans les logs, pas dans le navigateur.
    const detail = await res.text().catch(() => '');
    console.error(`GitHub ${init?.method ?? 'GET'} ${path} → ${res.status}: ${detail}`);
    throw new Error(`GitHub ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface FileToCommit {
  path: string;
  content: string;
}

export interface CommitResult {
  branch: string;
  commitSha: string;
}

/**
 * Crée la branche de relecture si besoin, puis y écrit un commit unique
 * portant tous les fichiers du lot.
 *
 * Refuse tout chemin hors des cinq autorisés et toute branche qui ne porte pas
 * le préfixe de relecture : ce module ne peut structurellement pas écrire
 * ailleurs, même appelé de travers.
 */
export async function commitReviewFiles(
  ctx: GitHubContext,
  params: { branch: string; message: string; files: FileToCommit[] },
): Promise<CommitResult> {
  const { branch, message, files } = params;

  if (!branch.startsWith(QUIZ_REVIEW_BRANCH_PREFIX)) {
    throw new Error(`Branche interdite pour ce module : ${branch}`);
  }
  const outside = files.map((f) => f.path).filter((p) => !QUIZ_REVIEW_PATHS.includes(p));
  if (outside.length > 0) {
    throw new Error(`Chemins interdits pour ce module : ${outside.join(', ')}`);
  }
  if (files.length === 0) {
    throw new Error('Aucun fichier à écrire');
  }

  const mainRef = await call<{ object: { sha: string } }>(ctx, '/git/ref/heads/main');
  const baseSha = mainRef.object.sha;
  const baseCommit = await call<{ tree: { sha: string } }>(ctx, `/git/commits/${baseSha}`);

  const blobs = await Promise.all(
    files.map(async (f) => {
      const blob = await call<{ sha: string }>(ctx, '/git/blobs', {
        method: 'POST',
        body: { content: f.content, encoding: 'utf-8' },
      });
      return { path: f.path, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
    }),
  );

  const tree = await call<{ sha: string }>(ctx, '/git/trees', {
    method: 'POST',
    body: { base_tree: baseCommit.tree.sha, tree: blobs },
  });

  const commit = await call<{ sha: string }>(ctx, '/git/commits', {
    method: 'POST',
    body: { message, tree: tree.sha, parents: [baseSha] },
  });

  // La branche part toujours de la tête de `main` : elle est créée pour ce
  // lot, jamais réutilisée d'une session à l'autre.
  await call(ctx, '/git/refs', {
    method: 'POST',
    body: { ref: `refs/heads/${branch}`, sha: commit.sha },
  });

  return { branch, commitSha: commit.sha };
}

export interface OpenPr {
  number: number;
  branch: string;
  headRepo: string | null;
  baseRef: string;
  sha: string;
  createdAt: string;
}

/** PR de relecture ouvertes, et elles seules. */
export async function listOpenReviewPrs(ctx: GitHubContext): Promise<OpenPr[]> {
  const prs = await call<
    Array<{
      number: number;
      head: { ref: string; sha: string; repo: { full_name: string } | null };
      base: { ref: string };
      created_at: string;
    }>
  >(ctx, '/pulls?state=open&per_page=100');

  return prs
    .filter((p) => p.head.ref.startsWith(QUIZ_REVIEW_BRANCH_PREFIX))
    .map((p) => ({
      number: p.number,
      branch: p.head.ref,
      headRepo: p.head.repo?.full_name ?? null,
      baseRef: p.base.ref,
      sha: p.head.sha,
      createdAt: p.created_at,
    }));
}

export async function openReviewPr(
  ctx: GitHubContext,
  params: { branch: string; title: string; body: string },
): Promise<{ number: number }> {
  return call<{ number: number }>(ctx, '/pulls', {
    method: 'POST',
    body: { title: params.title, body: params.body, head: params.branch, base: 'main' },
  });
}

/**
 * État de la CI pour un sha, lu par l'API Actions et non par l'API Checks.
 *
 * `GET /commits/{sha}/check-runs` serait le bon endpoint, et c'est celui que
 * lit `github-pr.ts`. Il est inaccessible ici : GitHub a retiré la permission
 * « Checks » des jetons fine-grained — seules les GitHub Apps y accèdent
 * encore — et le refus est un 403 même sur un dépôt public. Avec le jeton
 * cantonné à ce dépôt que la page réclame, `check-runs` bloquerait donc la
 * fusion en permanence, derrière un 502 qui ne nomme pas la cause.
 *
 * `GET /actions/runs?head_sha=` rend la même information sous la permission
 * « Actions » (lecture), que les jetons fine-grained ont bien.
 *
 * Écart assumé : un contrôle qui ne viendrait pas de GitHub Actions — une
 * vérification de déploiement posée par une application tierce — serait
 * invisible pour cette garde. Le 2026-08-26, les seuls contrôles du dépôt
 * sont ceux de `.github/workflows/`. Si un jour il en arrive d'ailleurs,
 * cette fonction ment par omission et doit être revue.
 *
 * Les noms rendus sont ceux des WORKFLOWS (« CI »), pas ceux des jobs
 * (« Lint, Typecheck & Build ») que rend `check-runs` : toute liste de noms
 * attendus écrite en face de cette fonction doit suivre cette convention.
 */
export async function reviewCheckState(
  ctx: GitHubContext,
  sha: string,
): Promise<CheckState> {
  const data = await call<{
    workflow_runs?: Array<{ name: string; status: string; conclusion: string | null }>;
  }>(ctx, `/actions/runs?head_sha=${sha}&per_page=100`);

  const runs = data.workflow_runs ?? [];
  return {
    passed: runs.filter((r) => r.conclusion === 'success').length,
    pending: runs.filter((r) => r.status !== 'completed').length,
    failed: runs
      .filter((r) => r.conclusion !== null && r.conclusion !== 'success' && r.conclusion !== 'neutral' && r.conclusion !== 'skipped')
      .map((r) => r.name),
    total: runs.length,
  };
}

/** Fusion en squash, sur le sha attendu : GitHub refuse si la branche a bougé. */
export async function mergeReviewPr(
  ctx: GitHubContext,
  params: { number: number; sha: string },
): Promise<{ merged: boolean }> {
  return call<{ merged: boolean }>(ctx, `/pulls/${params.number}/merge`, {
    method: 'PUT',
    body: { merge_method: 'squash', sha: params.sha },
  });
}

export interface ReviewFile {
  content: string;
  /** Sha du blob, jeton de concurrence optimiste : s'il a bougé depuis le
   *  chargement de la page, un régénérateur CLI ou un push direct est passé
   *  entretemps et le lot doit être refusé plutôt qu'écraser. */
  sha: string;
}

/** Lit un des cinq fichiers de la relecture sur `main`. */
export async function readReviewFile(
  ctx: GitHubContext,
  path: string,
): Promise<ReviewFile> {
  if (!QUIZ_REVIEW_PATHS.includes(path)) {
    throw new Error(`Chemin interdit pour ce module : ${path}`);
  }
  const data = await call<{ content: string; sha: string }>(
    ctx,
    `/contents/${path}?ref=main`,
  );
  return {
    content: Buffer.from(data.content, 'base64').toString('utf-8'),
    sha: data.sha,
  };
}

/** Chemins touchés par une PR de relecture, pour la garde de liste blanche. */
export async function reviewPrFiles(
  ctx: GitHubContext,
  number: number,
): Promise<string[]> {
  const files = await call<Array<{ filename: string }>>(
    ctx,
    `/pulls/${number}/files?per_page=100`,
  );
  return files.map((f) => f.filename);
}
