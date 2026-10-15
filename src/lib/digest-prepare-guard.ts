// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde du brouillon du dimanche (`/api/cron/prepare-digest`).
 *
 * Le digest d'une semaine peut etre approuve AVANT le dimanche 21 h : on lance
 * la preparation a la main, puis on approuve avec l'envoi programme au lundi
 * (cas des conges, 16/10/2026). Les mails sont alors deja programmes chez
 * Resend et `pending-digest.json` porte `sent: true`.
 *
 * Sans cette garde, le passage du dimanche reecrivait le fichier avec
 * `approved: false, sent: false` : aucun double envoi (le filet du lundi saute
 * un digest non approuve), mais l'ecran de relecture montrait un digest « a
 * approuver », et l'approuver aurait envoye une seconde fois a toute la liste.
 *
 * Fonction pure, testable sans le client GitHub ni Next.js.
 */

export interface PendingDigestState {
  week?: string;
  sent?: boolean;
}

/** Vrai si le digest de `week` est deja envoye ou programme : ne rien reecrire. */
export function digestDejaEnvoye(previous: PendingDigestState | null, week: string): boolean {
  return previous?.week === week && previous.sent === true;
}
