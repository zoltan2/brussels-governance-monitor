// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Cohérence entre le `changeType` d'une fiche et le `type` de son entrée du
 * changelog.
 *
 * Le 28/09/2026, l'accueil affichait « Correction » devant une information
 * nouvelle (dossier enseignement). `changeType: corrected` avait été posé le
 * 22/09 pour une vraie correction de FAQ (#546) ; la veille du 28/09 (#620) a
 * réécrit `changeSummary` et `changeSummaryDate` sans remettre `changeType`,
 * alors que son entrée du changelog disait `updated`. La barre de l'accueil lit
 * les deux (src/lib/latest-update-headline.ts : `isCorrection`), la bannière
 * « ce qui a changé » de la fiche lit le seul `changeType`. Un champ d'état
 * hérité de la veille précédente suffisait.
 *
 * Invariant : quand `changeSummaryDate` tombe le jour de la dernière entrée du
 * changelog de la fiche, le résumé PARLE de cette entrée, et `changeType` doit
 * dire la même chose que son `type`. Mesuré sur tout le dépôt le 28/09 après
 * #623 : 204 fiches dans ce cas, toutes concordantes sauf les 4 `housing` (voir
 * plus bas), d'où une garde sur tout le dépôt et non sur les seules fiches
 * modifiées.
 *
 * Vocabulaires : cinq collections partagent celui du changelog (added,
 * updated, corrected, removed). Les fiches domaine en ont un autre (new,
 * updated, status-change, data-refresh ; velite.config.ts) : `new` y répond à
 * `added`, les trois autres à `updated`, et elles n'ont AUCUNE valeur pour
 * `corrected` ni `removed`. Une entrée `corrected` sur un domaine (housing, le
 * 24/09) n'est donc pas représentable dans la fiche : avertissement, jamais
 * échec, tant que le schéma n'a pas `corrected`.
 *
 * Plusieurs entrées le même jour (une correction et une mise à jour) : la fiche
 * peut reprendre l'un ou l'autre type.
 *
 * Module pur, sans accès disque.
 */

export type ChangelogType = 'added' | 'updated' | 'corrected' | 'removed';

/** Dossier de contenu → section du changelog. */
export const SECTION_OF_DIR: Readonly<Record<string, string>> = {
  'content/domain-cards': 'domains',
  'content/dossiers': 'dossiers',
  'content/sector-cards': 'sectors',
  'content/commune-cards': 'communes',
  'content/comparison-cards': 'comparisons',
  'content/solution-cards': 'solutions',
};

/** Valeurs de `changeType` des fiches domaine qui répondent à chaque type du changelog. */
const DOMAIN_EQUIVALENTS: Readonly<Record<ChangelogType, readonly string[]>> = {
  added: ['new'],
  updated: ['updated', 'status-change', 'data-refresh'],
  corrected: [],
  removed: [],
};

export interface ChangelogRef {
  date: string;
  type: ChangelogType;
  section: string;
  targetSlug: string | null;
}

export interface CardChangeFields {
  /** Dossier de contenu, ex. `content/dossiers`. */
  dir: string;
  slug: string;
  changeType?: string;
  changeSummaryDate?: string;
}

export interface ChangeTypeFinding {
  level: 'error' | 'warning';
  message: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

/** Types acceptés dans la fiche pour une entrée du changelog de ce type. */
function acceptedCardValues(dir: string, type: ChangelogType): readonly string[] {
  return dir === 'content/domain-cards' ? DOMAIN_EQUIVALENTS[type] : [type];
}

/**
 * Constat pour une fiche, ou null si elle est en règle ou hors du cas
 * (pas d'entrée du changelog, pas de `changeSummaryDate`, ou résumé qui ne
 * date pas du jour de la dernière entrée).
 */
export function changeTypeFinding(card: CardChangeFields, changelog: readonly ChangelogRef[]): ChangeTypeFinding | null {
  const section = SECTION_OF_DIR[card.dir];
  if (!section) return null;
  const day = card.changeSummaryDate && ISO_DAY.test(card.changeSummaryDate) ? card.changeSummaryDate.slice(0, 10) : null;
  if (!day) return null;

  const mine = changelog.filter((e) => e.section === section && e.targetSlug === card.slug);
  if (mine.length === 0) return null;
  const last = mine.reduce((max, e) => (e.date > max ? e.date : max), mine[0].date);
  if (day !== last) return null;

  const types = [...new Set(mine.filter((e) => e.date === last).map((e) => e.type))];
  // Pas de changeType : la bannière affiche « mis à jour » par défaut.
  const declared = card.changeType ?? 'updated';
  if (types.some((t) => acceptedCardValues(card.dir, t).includes(declared))) return null;

  const expected = types.flatMap((t) => acceptedCardValues(card.dir, t));
  if (expected.length === 0) {
    return {
      level: 'warning',
      message:
        `changelog du ${last} de type ${types.join(' + ')}, que le schéma des fiches domaine ne sait pas dire ` +
        `(changeType : new, updated, status-change, data-refresh). La bannière de la fiche affiche « ${declared} ».`,
    };
  }
  const shown = card.changeType === undefined ? 'absent (lu « updated »)' : `« ${card.changeType} »`;
  return {
    level: 'error',
    message:
      `changeType ${shown}, mais l'entrée du changelog du ${last} (même jour que changeSummaryDate) est de type ` +
      `${types.join(' + ')}. Mettre changeType: ${expected[0]} dans les 4 langues : sinon la barre de l'accueil ` +
      'et la bannière de la fiche disent « Correction » sur une information nouvelle, ou taisent une correction.',
  };
}
