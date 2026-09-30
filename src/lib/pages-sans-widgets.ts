// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Pages où la bulle du chat et le panneau de jeux ne sont PAS montés.
 *
 * Le sondage lecteurs (/fr/sondage, /nl/enquete) : un lecteur y remplit un
 * questionnaire écran par écran, le focus suit les titres ; deux boutons
 * flottants et leurs fenêtres modales y ajouteraient des arrêts de tabulation et
 * des distractions (revue d'accessibilité de la spec, § 12). Chemins réels
 * (ceux de la barre d'adresse), avec ou sans barre finale.
 */
const CHEMINS = ['/fr/sondage', '/nl/enquete'];

export function estPageSansWidgets(chemin: string | null | undefined): boolean {
  if (!chemin) return false;
  const net = chemin.length > 1 ? chemin.replace(/\/+$/, '') : chemin;
  return CHEMINS.includes(net);
}
