// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Enregistre un lot de décisions de relecture : un commit, une PR, rien de
 * plus. La fusion est un geste distinct (`../merge`), et la CI passe entre les
 * deux — c'est ce qui remet `content-lint` sur le chemin des pools de quiz,
 * alors qu'un push direct sur `main` le contournerait.
 *
 * Toute la logique décidable vit dans `src/lib/quiz-review-apply.ts` et
 * `src/lib/quiz-review-guards.ts`, testés seuls : une route qui importe
 * `@/auth` n'exécute aucun test sans échouer pour autant.
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOriginRefusal } from '@/lib/same-origin';
import { applyDecisions, type PoolsByLocale } from '@/lib/quiz-review-apply';
import { LOCALES, type ReviewState } from '@/lib/quiz-review';
import {
  QUIZ_REVIEW_BRANCH_PREFIX,
  REVIEW_STATE_PATH,
  poolPathFor,
  commitMessageFor,
  secondSessionRefusal,
  shaRefusal,
  REVIEWER_LABEL,
} from '@/lib/quiz-review-guards';
import {
  reviewContext,
  readReviewFile,
  listOpenReviewPrs,
  commitReviewFiles,
  openReviewPr,
} from '@/lib/github-commit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  decisions: z
    .array(
      z.object({
        locale: z.enum(LOCALES),
        questionId: z.string().regex(/^[a-z0-9-]{3,80}$/, 'identifiant invalide'),
        status: z.enum(['approved', 'rejected']),
        note: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(300),
  /** Sha des blobs lus à l'ouverture de la page, jeton de concurrence. */
  shas: z.record(z.string(), z.string().regex(/^[0-9a-f]{40}$/)),
});

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const originRefusal = sameOriginRefusal(req.headers);
  if (originRefusal) {
    return NextResponse.json({ error: originRefusal }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const { decisions, shas } = parsed.data;

  let ctx;
  try {
    ctx = reviewContext();
  } catch {
    return NextResponse.json({ error: 'Configuration GitHub absente' }, { status: 500 });
  }

  try {
    const openPrs = await listOpenReviewPrs(ctx);
    const sessionRefusal = secondSessionRefusal(openPrs);
    if (sessionRefusal) {
      return NextResponse.json({ error: sessionRefusal }, { status: 409 });
    }

    const paths = [REVIEW_STATE_PATH, ...LOCALES.map((l) => poolPathFor(l))];
    const files = await Promise.all(paths.map((p) => readReviewFile(ctx, p)));

    // Concurrence : un régénérateur CLI ou un push direct passé depuis
    // l'ouverture de la page déplace le sha du blob. Refuser plutôt
    // qu'écraser — git ne signalerait rien, le commit étant un descendant.
    const refus = shaRefusal(
      paths.map((p, i) => ({ path: p, sha: files[i]!.sha })),
      shas,
    );
    if (refus) {
      return NextResponse.json(refus, { status: 409 });
    }

    const state = JSON.parse(files[0]!.content) as ReviewState;
    const pools = Object.fromEntries(
      LOCALES.map((l, i) => [l, JSON.parse(files[i + 1]!.content)]),
    ) as PoolsByLocale;

    const now = new Date().toISOString().slice(0, 10);
    // Constante, jamais l'adresse de session : `reviewedBy` part dans un
    // dépôt public et son historique ne se réécrit pas.
    const reviewer = REVIEWER_LABEL;
    const result = applyDecisions({ pools, state, decisions, now, reviewer });

    const branch = `${QUIZ_REVIEW_BRANCH_PREFIX}${now}-${Date.now().toString(36)}`;
    const message = commitMessageFor(result.counts);

    await commitReviewFiles(ctx, {
      branch,
      message,
      files: [
        { path: REVIEW_STATE_PATH, content: JSON.stringify(result.state, null, 2) + '\n' },
        ...LOCALES.map((l) => ({
          path: poolPathFor(l),
          content: JSON.stringify(result.pools[l], null, 2) + '\n',
        })),
      ],
    });

    const pr = await openReviewPr(ctx, {
      branch,
      title: message,
      body: [
        `${result.counts.approved} question(s) approuvée(s), ${result.counts.rejected} retirée(s) du quiz.`,
        '',
        'Les compteurs des quatre langues sont recalculés depuis l’état de relecture.',
        'Une question retirée sort du pool servi ; son unité passe sous quota et sera régénérée.',
      ].join('\n'),
    });

    return NextResponse.json({ number: pr.number, branch, counts: result.counts });
  } catch (err) {
    // Le message d'erreur GitHub reste dans les logs : il porte le dépôt, le
    // quota et la formulation des permissions manquantes.
    console.error('Relecture quiz — échec :', err);
    const message = err instanceof Error && err.message.startsWith('Question')
      ? err.message
      : 'Enregistrement impossible';
    const status = message.startsWith('Question') ? 422 : 502;
    return NextResponse.json({ error: message }, { status });
  }
});
