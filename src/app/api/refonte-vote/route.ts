// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * POST /api/refonte-vote — enregistre un vote de la consultation /refonte.
 *
 * Validation Zod stricte sur les enums des 5 axes (toute valeur inconnue =
 * 400). Cookie `refonte_voted=1` (httpOnly, 90j) posé en réponse pour
 * limiter à 1 vote/navigateur ; vérifié à l'arrivée pour rejeter les
 * resoumissions évidentes (409). Cookie effaçable, donc l'article de
 * synthèse doit annoncer la non-auditabilité (cf. spec).
 *
 * Si email opt-in, propage le contact vers Resend (sources=refonte). Toute
 * erreur Resend est logguée mais ne fait pas échouer le vote.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { recordVote, type RefonteVote } from '@/lib/refonte-votes';
import { addContact } from '@/lib/resend';

export const runtime = 'nodejs';

const VoteSchema = z.object({
  axis1: z.enum(['thermometre', 'mosaique', 'texte_fort', 'multilingue']),
  axis2: z.enum(['sobre_actuel', 'sobre_vivant', 'journalistique', 'voix_editeur']),
  axis3: z.enum(['digest', 'magazine', 'podcast', 'quiz', 'multilingue', 'plusieurs']),
  axis4: z.enum(['quotidien', 'hebdo', 'evenement', 'mixte']),
  axis5: z.enum(['minimal', 'standard', 'chiffres', 'complete']),
  comment: z.string().max(2000).optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  emailOptIn: z.boolean().optional().default(false),
});

const COOKIE_NAME = 'refonte_voted';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 jours

export async function POST(req: NextRequest) {
  // Re-soumission évidente — refus
  const cookieStore = await cookies();
  if (cookieStore.get(COOKIE_NAME)?.value === '1') {
    return NextResponse.json(
      { error: 'already_voted', message: 'Tu as déjà voté depuis ce navigateur.' },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, emailOptIn, comment, ...axes } = parsed.data;
  const hasEmail = Boolean(email && email.length > 0);

  const vote: RefonteVote = {
    ...axes,
    comment,
    email_optin: emailOptIn && hasEmail,
    has_email: hasEmail,
  };

  let voteId: string;
  try {
    voteId = await recordVote(vote);
  } catch (err) {
    console.error('[refonte-vote] recordVote failed:', err);
    return NextResponse.json(
      { error: 'storage_unavailable' },
      { status: 503 },
    );
  }

  // Resend opt-in — best effort, ne bloque pas le vote
  if (hasEmail && emailOptIn && email) {
    try {
      await addContact(email, 'fr', [], ['refonte']);
    } catch (err) {
      console.error('[refonte-vote] Resend opt-in failed (non-fatal):', err);
    }
  }

  // Cookie anti-double-vote
  cookieStore.set(COOKIE_NAME, '1', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return NextResponse.json({ ok: true, id: voteId });
}
