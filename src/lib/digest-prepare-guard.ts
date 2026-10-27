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

/**
 * Semaine ISO 8601 de `date`, calculee en UTC : `2026-w42`.
 *
 * L'ancienne formule de la route (jour local, `Math.round`, `getDay()` du
 * 4 janvier) decalait la semaine d'un cran du lundi au vendredi en 2026 dans
 * le conteneur en UTC : le passage du dimanche tombait juste, mais une
 * preparation lancee a la main le vendredi 16/10/2026 visait w41 au lieu de w42.
 */
export function isoWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour); // le jeudi de la semaine porte son annee ISO
  const annee = d.getUTCFullYear();
  const debut = Date.UTC(annee, 0, 1);
  const semaine = Math.ceil(((d.getTime() - debut) / 86400000 + 1) / 7);
  return `${annee}-w${String(semaine).padStart(2, '0')}`;
}
