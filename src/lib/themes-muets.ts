// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Thèmes en silence (lot 3 de l'abonnement, 02/10/2026).
 *
 * Un abonné dont aucun thème n'a été mis à jour ne reçoit pas de digest : c'est
 * voulu (on ne reçoit que ce qu'on a choisi). Ce module mesure QUI ne reçoit
 * plus rien et SUR QUOI, pour que la rédaction aille vérifier s'il y a du neuf.
 * Il ne publie rien et ne pousse à rien publier : un thème sans fait nouveau
 * reste muet.
 *
 * Module PUR : la règle de correspondance entre un thème et une fiche est
 * celle de l'envoi, reçue en paramètre (`filterUpdatesForSubscriber`). Aucune
 * seconde définition à maintenir.
 *
 * Le résultat ne porte que des comptes : ni adresse, ni abonné identifiable.
 */

export const FENETRE_JOURS = 14;
export const AGE_MAX_HEURES = 48;

/** Thèmes acceptés par l'API mais qu'aucun digest n'envoie jamais. */
const SANS_ENVOI = ['engagements', 'solutions'];

export interface FicheDatee {
  /** Clé de thème de la fiche, telle que l'envoi la compare. */
  domain: string;
  section: string;
  /** Date de dernière modification, `AAAA-MM-JJ` ou horodatage ISO. */
  lastModified: string;
}

export interface InstantaneThemesMuets {
  calculeLe: string;
  fenetreJours: number;
  abonnes: number;
  abonnesEnSilence: number;
  themesMuets: Array<{ theme: string; abonnes: number; derniereMaj: string | null }>;
  sansEnvoiPossible: { themes: string[]; abonnesSeuls: number };
}

const jour = (d: string) => d.slice(0, 10);

export function calculerThemesMuets<F extends FicheDatee>({
  contacts,
  fiches,
  maintenant,
  filtrer,
}: {
  contacts: ReadonlyArray<{ topics: string[] }>;
  fiches: ReadonlyArray<F>;
  maintenant: Date;
  /** La règle de l'envoi : les fiches qu'un abonné à ces thèmes recevrait. */
  filtrer: (fiches: F[], themes: string[]) => F[];
}): InstantaneThemesMuets {
  // Premier jour de la fenêtre, compris : aujourd'hui moins 14 jours.
  const debut = new Date(maintenant.getTime() - FENETRE_JOURS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const toutes = [...fiches];
  const recentes = toutes.filter((f) => jour(f.lastModified) >= debut);

  let abonnesEnSilence = 0;
  let abonnesSeuls = 0;
  const porteurs = new Map<string, number>();
  for (const { topics } of contacts) {
    if (filtrer(recentes, topics).length === 0) abonnesEnSilence++;
    if (topics.length > 0 && topics.every((t) => SANS_ENVOI.includes(t))) abonnesSeuls++;
    for (const t of new Set(topics)) porteurs.set(t, (porteurs.get(t) ?? 0) + 1);
  }

  const themesMuets = [...porteurs.entries()]
    .filter(([theme]) => !SANS_ENVOI.includes(theme))
    .filter(([theme]) => filtrer(recentes, [theme]).length === 0)
    .map(([theme, abonnes]) => {
      const dates = filtrer(toutes, [theme]).map((f) => jour(f.lastModified)).sort();
      return { theme, abonnes, derniereMaj: dates.at(-1) ?? null };
    })
    .sort((a, b) => b.abonnes - a.abonnes || a.theme.localeCompare(b.theme));

  return {
    calculeLe: maintenant.toISOString(),
    fenetreJours: FENETRE_JOURS,
    abonnes: contacts.length,
    abonnesEnSilence,
    themesMuets,
    sansEnvoiPossible: {
      themes: SANS_ENVOI.filter((t) => porteurs.has(t)),
      abonnesSeuls,
    },
  };
}

export type LectureInstantane =
  | { etat: 'absent' }
  | { etat: 'frais' | 'perime'; instantane: InstantaneThemesMuets };

/**
 * Valide ce qui a été lu sur disque. Un fichier absent ou illisible rend
 * « absent » : la tuile doit le dire, jamais afficher un zéro qui passerait
 * pour « personne n'est en silence ».
 */
export function lireInstantane(brut: unknown, maintenant: Date): LectureInstantane {
  if (brut === null || typeof brut !== 'object') return { etat: 'absent' };
  const i = brut as Partial<InstantaneThemesMuets>;
  const calcule = typeof i.calculeLe === 'string' ? Date.parse(i.calculeLe) : NaN;
  if (
    Number.isNaN(calcule) ||
    typeof i.abonnes !== 'number' ||
    typeof i.abonnesEnSilence !== 'number' ||
    !Array.isArray(i.themesMuets) ||
    !i.sansEnvoiPossible ||
    !Array.isArray(i.sansEnvoiPossible.themes)
  ) {
    return { etat: 'absent' };
  }
  const ageHeures = (maintenant.getTime() - calcule) / (60 * 60 * 1000);
  return { etat: ageHeures > AGE_MAX_HEURES ? 'perime' : 'frais', instantane: i as InstantaneThemesMuets };
}
