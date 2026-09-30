// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Période de la campagne du sondage lecteurs, et mode pilote.
 *
 * Calendrier décidé le 27/09/2026 (spec § 12), avancé le 30/09 : pilote puis
 * vrai sondage ouverts le 30/09 (SONDAGE_OUVERTURE en production), encart en
 * tête de chaque digest fr et nl tant que la campagne est ouverte
 * (encart-digest.ts), clôture le 06/12/2026, restitution dans le digest du
 * 14/12/2026. Réponses conservées jusqu'au 06/12/2027.
 *
 * Ouverture et clôture se règlent sans redéploiement de code, par variables
 * d'environnement au format AAAA-MM-JJ, en heure de Bruxelles :
 *   SONDAGE_OUVERTURE  premier jour ouvert   (défaut 2026-10-12, semaine du pilote)
 *   SONDAGE_CLOTURE    dernier jour ouvert   (défaut 2026-12-06, inclus)
 * Une valeur mal formée est ignorée au profit du défaut, jamais interprétée.
 *
 * Mode pilote : SONDAGE_PILOTE=1 marque TOUTES les nouvelles réponses `pilote`
 * (retiré en production le 30/09/2026). Sans la variable, un lien
 * `/fr/sondage?pilote=1` marque la réponse de celui qui le suit. Une réponse
 * pilote est exclue des effectifs de l'admin et des analyses.
 */

export const OUVERTURE_DEFAUT = '2026-10-12';
export const CLOTURE_DEFAUT = '2026-12-06';
/** Au-delà de ce jour, les réponses brutes sont supprimées (purge.ts). */
export const FIN_CONSERVATION_REPONSES = '2027-12-06';
/** Au plus tard ce jour, les coordonnées des volontaires (e-mail, téléphone) sont supprimées. */
export const FIN_CONSERVATION_ENTRETIENS = '2026-12-06';

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

function jourValide(v: string | undefined): string | null {
  if (!v || !JOUR.test(v)) return null;
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? null : v;
}

/** Le jour civil à Bruxelles, AAAA-MM-JJ. Les dates stockées ne sont jamais plus précises. */
export function jourBruxelles(maintenant: Date): string {
  // en-CA rend AAAA-MM-JJ.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(maintenant);
}

export type EtatCampagne = 'ouverte' | 'pas_encore' | 'close';

export interface Campagne {
  ouverture: string;
  cloture: string;
}

export function campagneDepuisEnv(env: Record<string, string | undefined> = process.env): Campagne {
  return {
    ouverture: jourValide(env.SONDAGE_OUVERTURE) ?? OUVERTURE_DEFAUT,
    cloture: jourValide(env.SONDAGE_CLOTURE) ?? CLOTURE_DEFAUT,
  };
}

/** Bornes incluses, comparées au jour de Bruxelles (chaînes AAAA-MM-JJ). */
export function etatCampagne(maintenant: Date, c: Campagne = campagneDepuisEnv()): EtatCampagne {
  const jour = jourBruxelles(maintenant);
  if (jour < c.ouverture) return 'pas_encore';
  if (jour > c.cloture) return 'close';
  return 'ouverte';
}

export function piloteParEnv(env: Record<string, string | undefined> = process.env): boolean {
  return env.SONDAGE_PILOTE === '1';
}
