// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Calendrier des coulisses : un rendez-vous par mois, le premier jeudi, jour
 * de Bruxelles (décision de Zoltán, 3 novembre 2026). L'envoi réel n'est
 * accepté que ce jour-là : un rendez-vous manqué n'est jamais rattrapé.
 *
 * Tout se compare en dates de calendrier AAAA-MM-JJ (jours-ecoules.ts) : pas
 * d'heure, donc pas d'effet du changement d'heure.
 */
import { jourABruxelles } from '@/lib/jours-ecoules';

const MOIS = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function moisValide(mois: unknown): mois is string {
  return typeof mois === 'string' && MOIS.test(mois);
}

/** Premier jeudi du mois AAAA-MM, en AAAA-MM-JJ. */
export function premierJeudi(mois: string): string {
  const [a, m] = mois.split('-').map(Number);
  // Midi UTC : le jour de la semaine ne dépend d'aucun fuseau.
  const premier = new Date(Date.UTC(a, m - 1, 1, 12));
  const decalage = (4 - premier.getUTCDay() + 7) % 7; // 4 = jeudi
  return `${mois}-${String(1 + decalage).padStart(2, '0')}`;
}

function moisSuivant(mois: string): string {
  const [a, m] = mois.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Le rendez-vous à préparer : celui du mois en cours tant que son premier
 * jeudi n'est pas passé (jour même compris), sinon celui du mois suivant.
 */
export function prochainRendezVous(maintenant: Date): { mois: string; jour: string } {
  const aujourdhui = jourABruxelles(maintenant);
  const mois = aujourdhui.slice(0, 7);
  const jour = premierJeudi(mois);
  if (aujourdhui <= jour) return { mois, jour };
  const suivant = moisSuivant(mois);
  return { mois: suivant, jour: premierJeudi(suivant) };
}

/** Vrai le premier jeudi du mois `mois`, à Bruxelles, et ce jour-là seulement. */
export function estJourDEnvoi(mois: string, maintenant: Date): boolean {
  return moisValide(mois) && jourABruxelles(maintenant) === premierJeudi(mois);
}

/** « jeudi 3 décembre 2026 », pour l'admin. */
export function jourEnClair(jour: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${jour}T12:00:00Z`));
}
