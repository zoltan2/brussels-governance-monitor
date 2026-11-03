// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Corps d'un POST de désabonnement en un clic (RFC 8058) : le champ
 * `List-Unsubscribe` valant `One-Click`. Les messageries l'envoient en
 * `application/x-www-form-urlencoded` ou en `multipart/form-data` (que la RFC
 * recommande) : les deux sont acceptés. Avant le 3/11/2026, seule la chaîne
 * brute passait, et un POST multipart était refusé sans bruit (revue red team).
 *
 * Le corps a déjà été lu avec un plafond (readTextCapped) : on le relit ici
 * sans nouvelle lecture du réseau.
 */
export async function corpsOneClickValide(texte: string, contentType: string | null): Promise<boolean> {
  const type = (contentType ?? '').toLowerCase();
  try {
    if (type.startsWith('multipart/form-data')) {
      const form = await new Response(texte, { headers: { 'content-type': contentType! } }).formData();
      return form.get('List-Unsubscribe') === 'One-Click';
    }
    return new URLSearchParams(texte.trim()).get('List-Unsubscribe') === 'One-Click';
  } catch {
    return false;
  }
}
