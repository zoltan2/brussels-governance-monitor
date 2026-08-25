// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { QuizReviewList } from '@/components/admin/quiz-review-list';
import { LOCALES, type ReviewState } from '@/lib/quiz-review';
import { buildReviewQueue, pendingByLocale } from '@/lib/quiz-review-queue';
import type { PoolsByLocale } from '@/lib/quiz-review-apply';
import { REVIEW_STATE_PATH, poolPathFor } from '@/lib/quiz-review-guards';
import { reviewContext, readReviewFile, listOpenReviewPrs } from '@/lib/github-commit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admin — Relecture du quiz',
    robots: { index: false, follow: false },
  };
}

/**
 * Tout est lu depuis le DÉPÔT, jamais depuis l'image Docker.
 *
 * `data/` n'est pas copié dans le runner du Dockerfile : une lecture disque
 * rendrait « zéro question relue » sans lever d'erreur. Et lire les pools dans
 * l'image alors qu'on les réécrit dans le dépôt écraserait une régénération
 * poussée entretemps, sans que git ne signale de conflit.
 */
async function loadFromRepo() {
  const ctx = reviewContext();
  const paths = [REVIEW_STATE_PATH, ...LOCALES.map((l) => poolPathFor(l))];
  const [stateFile, ...poolFiles] = await Promise.all(
    paths.map((p) => readReviewFile(ctx, p)),
  );

  const state = JSON.parse(stateFile!.content) as ReviewState;
  const pools = Object.fromEntries(
    LOCALES.map((l, i) => [l, JSON.parse(poolFiles[i]!.content)]),
  ) as PoolsByLocale;

  const shas: Record<string, string> = { [REVIEW_STATE_PATH]: stateFile!.sha };
  LOCALES.forEach((l, i) => {
    shas[poolPathFor(l)] = poolFiles[i]!.sha;
  });

  return { state, pools, shas, openPrs: await listOpenReviewPrs(ctx) };
}

export default async function AdminQuizPage() {
  let data: Awaited<ReturnType<typeof loadFromRepo>>;
  try {
    data = await loadFromRepo();
  } catch (err) {
    console.error('Relecture quiz — lecture du dépôt impossible :', err);
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-neutral-900">Relecture du quiz</h1>
        <p className="mt-4 text-neutral-700">
          Le dépôt est injoignable. La page lit l’état de relecture sur GitHub, pas
          dans l’image du site : sans lui, elle afficherait « zéro question relue »
          comme un fait.
        </p>
      </main>
    );
  }

  const cards = buildReviewQueue(data.pools, data.state);
  const pending = pendingByLocale(cards);
  const totalQuestions = LOCALES.reduce((n, l) => n + data.pools[l].questions.length, 0);
  const totalPending = LOCALES.reduce((n, l) => n + pending[l], 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">Relecture du quiz</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {totalPending === 0
          ? `Rien à relire — ${totalQuestions} questions, toutes relues.`
          : `${totalPending} décisions à prendre sur ${totalQuestions} questions.`}{' '}
        <span className="text-neutral-500">
          fr {pending.fr} · nl {pending.nl} · en {pending.en} · de {pending.de}
        </span>
      </p>

      {totalPending === 0 && (
        <p className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-700">
          Les questions neuves apparaissent ici après une régénération du pool
          (<code className="text-xs">npm run quiz:manual:dump</code>). Tant que la
          liste est vide, le quiz ne porte aucune mention de contenu non relu.
        </p>
      )}

      <QuizReviewList
        cards={cards}
        shas={data.shas}
        openPrs={data.openPrs.map((p) => ({ number: p.number, branch: p.branch, sha: p.sha }))}
      />
    </main>
  );
}
