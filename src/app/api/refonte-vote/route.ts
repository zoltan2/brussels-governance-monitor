// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * POST /api/refonte-vote : la consultation /refonte est CLOSE (29/09/2026).
 *
 * La route enregistrait un vote (validation Zod des 5 axes, cookie
 * anti-double-vote, opt-in Resend). La page ne propose plus de formulaire,
 * mais une requete directe pouvait encore voter : la route refuse donc tout,
 * sans lire le corps, sans rien ecrire en base et sans toucher Resend.
 *
 * 410 Gone plutot que 404 : la ressource a existe et ne reviendra pas, et le
 * message dit pourquoi a qui appelle encore l'ancienne adresse. Les votes deja
 * recus restent lisibles dans /admin/refonte (src/lib/refonte-votes.ts).
 * L'ancienne implementation est dans l'historique git.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function POST() {
  return NextResponse.json(
    {
      error: 'consultation_closed',
      message: 'La consultation /refonte est close depuis le 29 septembre 2026 : elle n’accepte plus de votes.',
    },
    { status: 410 },
  );
}
