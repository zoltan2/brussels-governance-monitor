// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Tile, TileStat } from './tile';
import { LOCALES, type ReviewState } from '@/lib/quiz-review';
import { buildReviewQueue, pendingByLocale } from '@/lib/quiz-review-queue';
import type { PoolsByLocale } from '@/lib/quiz-review-apply';
import { REVIEW_STATE_PATH, poolPathFor } from '@/lib/quiz-review-guards';
import { reviewContext, readReviewFile } from '@/lib/github-commit';

/**
 * Tuile « Quiz » du hub.
 *
 * Discrète en état nominal : un chiffre en gros caractères qui vaut zéro
 * pendant des semaines n'est que du bruit. Le `TileStat` n'apparaît que
 * lorsqu'il y a du travail.
 *
 * Elle lit le dépôt : en cas d'échec elle dit « Indisponible », jamais zéro —
 * un zéro trompeur ferait croire qu'il n'y a rien à relire.
 */
export async function QuizTile({ locale }: { locale: string }) {
  let pending: Record<string, number> | null = null;
  let total = 0;

  try {
    const ctx = reviewContext();
    const paths = [REVIEW_STATE_PATH, ...LOCALES.map((l) => poolPathFor(l))];
    const [stateFile, ...poolFiles] = await Promise.all(
      paths.map((p) => readReviewFile(ctx, p)),
    );
    const state = JSON.parse(stateFile!.content) as ReviewState;
    const pools = Object.fromEntries(
      LOCALES.map((l, i) => [l, JSON.parse(poolFiles[i]!.content)]),
    ) as PoolsByLocale;

    const cards = buildReviewQueue(pools, state);
    pending = pendingByLocale(cards);
    total = LOCALES.reduce((n, l) => n + pools[l].questions.length, 0);
  } catch (err) {
    console.error('Tuile quiz — lecture du dépôt impossible :', err);
  }

  if (!pending) {
    return (
      <Tile title="Quiz" href={`/${locale}/admin/quiz`} linkLabel="Ouvrir la relecture">
        <p className="text-sm text-neutral-600">Indisponible</p>
      </Tile>
    );
  }

  const totalPending = LOCALES.reduce((n, l) => n + (pending[l] ?? 0), 0);

  return (
    <Tile title="Quiz" href={`/${locale}/admin/quiz`} linkLabel="Ouvrir la relecture">
      {totalPending === 0 ? (
        <p className="text-sm text-neutral-600">À jour — {total} questions relues</p>
      ) : (
        <>
          <TileStat value={totalPending} label="décisions à prendre" />
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            {LOCALES.filter((l) => (pending[l] ?? 0) > 0).map((l) => (
              <li key={l} className="flex justify-between gap-3">
                <span>{l}</span>
                <span>{pending[l]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Tile>
  );
}
