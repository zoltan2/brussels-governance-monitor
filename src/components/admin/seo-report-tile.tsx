// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import {
  readSeoReport,
  type Bloc,
  type RapportSeo,
  type VisiteIa,
} from '@/lib/seo-report';
import { Tile } from './tile';
import { freshnessClassName, type Freshness } from '@/lib/snapshot-freshness';

const NOMS_BLOCS: Record<keyof RapportSeo['blocs'], string> = {
  gsc: 'Search Console',
  umami: 'Umami',
  crawl: 'Crawl technique',
};

/** Priorité d'affichage quand plusieurs blocs sont dégradés en même temps :
 * une horloge incohérente prime sur un simple retard. */
const GRAVITE: Record<Freshness['level'], number> = { clock: 2, stale: 1, fresh: 0 };

function pireFraicheur(fraicheur: RapportSeo['fraicheur']): Freshness | null {
  let pire: Freshness | null = null;
  for (const f of [fraicheur.gsc, fraicheur.umami, fraicheur.crawl]) {
    if (!f) continue;
    if (!pire || GRAVITE[f.level] > GRAVITE[pire.level]) pire = f;
  }
  return pire;
}

/** Somme stricte : une seule valeur absente rend le total illisible plutôt
 * que de le sous-évaluer en silence. */
function sommeStricte(valeurs: (number | null)[]): number | null {
  let total = 0;
  for (const v of valeurs) {
    if (v === null) return null;
    total += v;
  }
  return total;
}

/** Ligne de panne d'un bloc, ou null si le bloc est à jour. */
function ligneEtat(nom: string, bloc: Bloc<unknown>): string | null {
  const suffixe = bloc.message ? ` (${bloc.message})` : '';
  switch (bloc.status) {
    case 'ok':
      return null;
    case 'error':
      return `${nom} : panne${suffixe}`;
    case 'blocked':
      return `${nom} : bloqué${suffixe}`;
    case 'absent':
      return `${nom} : indisponible (aucun relevé)`;
    case 'format-inconnu':
      return `${nom} : format non reconnu`;
  }
}

function formatNombre(n: number | null): string {
  return n === null ? 'Indisponible' : n.toLocaleString('fr-BE');
}

/** null = liste absente ou du mauvais type (donnée manquante) : indisponible.
 * [] = liste présente et vide (COALESCE(..., '[]') côté SQL faute de ligne
 * correspondante) : un vrai zéro constaté, écrit en toutes lettres pour ne
 * jamais se confondre avec une panne. [...] = somme stricte habituelle. */
function ligneVisitesIa(liste: VisiteIa[] | null): string {
  if (liste === null) return 'Indisponible';
  if (liste.length === 0) return "Aucune visite d'assistant cette semaine";
  const total = sommeStricte(liste.map((v) => v.visites));
  return total === null ? 'Indisponible' : total.toLocaleString('fr-BE');
}

export async function SeoReportTile() {
  const rapport = await readSeoReport();
  const { gsc, umami, crawl } = rapport.blocs;

  const clicsBelgique = gsc.donnees?.clicsBelgique ?? null;
  const clicsPrecedents = gsc.donnees?.clicsBelgiquePrecedents ?? null;
  const variation =
    clicsBelgique !== null && clicsPrecedents !== null
      ? clicsBelgique - clicsPrecedents
      : null;

  // null = bloc pas à jour, ou visitesIa absent/du mauvais type : on ne sait
  // rien. [] = bloc à jour, visitesIa un tableau vide : zéro constaté. Voir
  // ligneVisitesIa pour l'affichage des trois cas.
  const visitesIaListe: VisiteIa[] | null =
    umami.status === 'ok' && umami.donnees ? umami.donnees.visitesIa : null;

  const alertesTechniques =
    crawl.status === 'ok' && crawl.donnees
      ? sommeStricte([crawl.donnees.bloquees, crawl.donnees.echecs])
      : null;

  // undefined = bloc GSC en panne, on ne sait pas s'il y a des actions.
  // null = bloc à jour mais aucune action cette semaine (pas une panne).
  const premiereAction =
    gsc.status === 'ok' && gsc.donnees
      ? (gsc.donnees.actions[0] ?? null)
      : undefined;

  const pannes = (
    [
      ligneEtat(NOMS_BLOCS.gsc, gsc),
      ligneEtat(NOMS_BLOCS.umami, umami),
      ligneEtat(NOMS_BLOCS.crawl, crawl),
    ] as const
  ).filter((ligne): ligne is string => ligne !== null);

  const fraicheur = pireFraicheur(rapport.fraicheur);

  return (
    <Tile
      title="Rapport SEO hebdomadaire"
      href="/fr/admin/rapport"
      linkLabel="Ouvrir le rapport"
    >
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-600">Clics Belgique</dt>
          <dd className="text-right tabular-nums text-neutral-900">
            {formatNombre(clicsBelgique)}
            {variation !== null && (
              <span className="ml-1 text-xs text-neutral-500">
                ({variation >= 0 ? '+' : ''}
                {variation.toLocaleString('fr-BE')})
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-600">Visites d&apos;assistants</dt>
          <dd className="text-right tabular-nums text-neutral-900">
            {ligneVisitesIa(visitesIaListe)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-600">Alertes techniques</dt>
          <dd className="text-right tabular-nums text-neutral-900">
            {formatNombre(alertesTechniques)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-600">Première action suggérée</dt>
          <dd className="mt-1 text-neutral-900">
            {premiereAction === undefined
              ? 'Indisponible'
              : premiereAction === null
                ? 'Aucune action cette semaine.'
                : (premiereAction.titre ??
                  `${premiereAction.regle} : ${premiereAction.url}`)}
          </dd>
        </div>
      </dl>

      {fraicheur && (
        <p className={freshnessClassName(fraicheur.level)}>{fraicheur.label}</p>
      )}

      {pannes.length > 0 && (
        <ul
          className="mt-3 space-y-1 text-xs font-medium text-amber-700"
          aria-live="polite"
        >
          {pannes.map((ligne) => (
            <li key={ligne}>{ligne}</li>
          ))}
        </ul>
      )}
    </Tile>
  );
}
