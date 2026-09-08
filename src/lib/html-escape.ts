// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Échappe une valeur avant interpolation dans un gabarit HTML.
 *
 * Extrait ici le 08/09/2026 après une revue adverse : la route de précommande
 * interpolait `${firstName}` brut dans l'email de confirmation, alors que le
 * récap voisin, écrit le même jour, échappait correctement. Le prénom accepte
 * 100 caractères libres et le destinataire vient du même formulaire public :
 * on pouvait donc envoyer du HTML arbitraire depuis un domaine vérifié BGM
 * vers n'importe quelle adresse.
 *
 * Un helper partagé plutôt qu'une copie par fichier, précisément pour que le
 * prochain gabarit d'email ne puisse pas l'oublier en silence.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
