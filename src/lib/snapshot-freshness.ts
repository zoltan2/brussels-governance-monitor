// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Âge d'un instantané déposé par un travail planifié du VPS, en clair.
 *
 * Un instantané figé doit se voir. Avant le 19/09/2026, la tuile Trafic
 * affichait « relevé il y a 35 j » du même gris que le reste, et une date
 * dans le futur donnait « relevé il y a moins d'une heure » : une horloge
 * déréglée ou un timer arrêté passaient inaperçus.
 *
 * Impur (Date.now), donc à appeler hors du rendu et à passer au composant
 * sous forme de valeurs déjà calculées.
 */
export type FreshnessLevel = 'fresh' | 'stale' | 'clock';

export interface Freshness {
  label: string;
  level: FreshnessLevel;
}

export function describeFreshness(
  iso: string | null,
  options: { staleAfterHours: number; now?: number },
): Freshness | null {
  if (!iso) return null;

  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;

  const now = options.now ?? Date.now();
  const ms = now - parsed;

  // Une minute de tolérance : les horloges du conteneur et de l'hôte ne sont
  // jamais parfaitement alignées.
  if (ms < -60_000) {
    return { label: 'horloge incohérente : instantané daté du futur', level: 'clock' };
  }

  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  const stale = hours >= options.staleAfterHours;
  const age =
    hours < 1
      ? "moins d'une heure"
      : hours < 24
        ? `${hours} h`
        : `${Math.floor(hours / 24)} j`;

  return stale
    ? { label: `en retard : dernier relevé il y a ${age}`, level: 'stale' }
    : { label: `relevé il y a ${age}`, level: 'fresh' };
}

/** Classe de texte associée au niveau, palette BGM (ambre, jamais rouge). */
export function freshnessClassName(level: FreshnessLevel): string {
  return level === 'fresh'
    ? 'mt-3 text-xs text-neutral-500'
    : 'mt-3 text-xs font-medium text-amber-700';
}

const GRAVITE_FRAICHEUR: Record<FreshnessLevel, number> = { clock: 2, stale: 1, fresh: 0 };

/** Fraîcheur la plus dégradée parmi plusieurs blocs, avec le nom de celui
 * qui la porte : une horloge incohérente prime sur un simple retard, qui
 * prime sur « à jour ». Sans le nom, le bloc fautif se confond avec les
 * autres dans un verdict unique — partagée pour ne pas juger deux fois
 * (tuile du hub, page /admin/rapport) avec des priorités différentes. */
export function pireFraicheurNommee(
  blocs: { nom: string; freshness: Freshness | null }[],
): { nom: string; freshness: Freshness } | null {
  let pire: { nom: string; freshness: Freshness } | null = null;
  for (const bloc of blocs) {
    if (!bloc.freshness) continue;
    if (!pire || GRAVITE_FRAICHEUR[bloc.freshness.level] > GRAVITE_FRAICHEUR[pire.freshness.level]) {
      pire = { nom: bloc.nom, freshness: bloc.freshness };
    }
  }
  return pire;
}
