// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Fusionne une PR de relecture, après avoir revérifié ses gardes.
 *
 * Les gardes ne sont pas reprises de `publication-guards.ts` : celui-ci
 * gouverne la publication de la veille, et lui ajouter les chemins du quiz
 * donnerait au pipeline de veille — piloté par un LLM — le droit d'écrire
 * dans les pools, donc de faire disparaître la mention de l'article 50.
 */

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOriginRefusal } from '@/lib/same-origin';
import { prRefusal, fileSetRefusal, checkStateRefusal } from '@/lib/quiz-review-guards';
import {
  reviewContext,
  listOpenReviewPrs,
  reviewPrFiles,
  reviewCheckState,
  mergeReviewPr,
} from '@/lib/github-commit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  number: z.number().int().positive(),
  sha: z.string().regex(/^[0-9a-f]{40}$/, 'sha complet attendu'),
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
  const { number, sha } = parsed.data;

  let ctx;
  try {
    ctx = reviewContext();
  } catch {
    return NextResponse.json({ error: 'Configuration GitHub absente' }, { status: 500 });
  }

  try {
    const pr = (await listOpenReviewPrs(ctx)).find((p) => p.number === number);
    if (!pr) {
      return NextResponse.json(
        { error: 'PR de relecture introuvable ou déjà fusionnée' },
        { status: 404 },
      );
    }

    const refusal =
      prRefusal({ branch: pr.branch, headRepo: pr.headRepo, baseRef: pr.baseRef }, ctx.repo) ??
      fileSetRefusal(await reviewPrFiles(ctx, number));
    if (refusal) {
      return NextResponse.json({ error: refusal }, { status: 403 });
    }

    if (pr.sha !== sha) {
      return NextResponse.json(
        { error: 'La branche a bougé depuis l’affichage' },
        { status: 409 },
      );
    }

    const checksRefusal = checkStateRefusal(await reviewCheckState(ctx, sha));
    if (checksRefusal) {
      return NextResponse.json({ error: checksRefusal }, { status: 409 });
    }

    const merged = await mergeReviewPr(ctx, { number, sha });
    return NextResponse.json({ merged: merged.merged });
  } catch (err) {
    console.error('Fusion de relecture — échec :', err);
    return NextResponse.json({ error: 'GitHub injoignable' }, { status: 502 });
  }
});
