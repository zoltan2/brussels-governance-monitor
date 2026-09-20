// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Link from 'next/link';
import {
  readSeoReport,
  gscMesurePresente,
  pagesCassees,
  type ActionSuggeree,
  type Bloc,
  type PageCrawl,
  type RapportSeo,
  type VisiteIa,
} from '@/lib/seo-report';
import { Tile, TileStat } from './tile';
import { freshnessClassName, pireFraicheurNommee } from '@/lib/snapshot-freshness';
import { chemin } from '@/lib/utils';

const NOMS_BLOCS: Record<keyof RapportSeo['blocs'], string> = {
  gsc: 'Search Console',
  umami: 'Umami',
  crawl: 'Crawl technique',
};

// Ordre de grandeur du sitemap (tâches 4-5) : repère pour juger une
// couverture anormalement faible, pas une mesure exacte à comparer au chiffre
// près.
const URLS_SITEMAP_ATTENDUES = 630;
const COUVERTURE_MINIMALE = 0.5;

/** Une couverture nulle ou très inférieure au sitemap est la panne la plus
 * bruyante possible côté crawl (le script tourne, ne trouve presque rien) :
 * elle doit alarmer même quand bloquées et échecs valent zéro. */
function couvertureFaible(pages: PageCrawl[] | null): boolean {
  if (pages === null) return false; // donnée manquante, déjà couverte ailleurs
  return pages.length < URLS_SITEMAP_ATTENDUES * COUVERTURE_MINIMALE;
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

/** Ligne de panne d'un bloc, ou null si sa sonde a réussi. */
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
  return n === null ? 'indisponible' : n.toLocaleString('fr-BE');
}

/** null = liste absente ou du mauvais type (donnée manquante) : indisponible.
 * [] = liste présente et vide (COALESCE(..., '[]') côté SQL faute de ligne
 * correspondante) : un vrai zéro constaté, dit en un mot (la phrase complète
 * vit sur la page, pas ici où la cellule reste courte). [...] = somme
 * stricte habituelle. */
function ligneVisitesIa(liste: VisiteIa[] | null): string {
  if (liste === null) return 'indisponible';
  if (liste.length === 0) return 'aucune';
  const total = sommeStricte(liste.map((v) => v.visites));
  return total === null ? 'indisponible' : total.toLocaleString('fr-BE');
}

/** Alertes techniques est une alarme, pas une mesure : au-dessus de zéro,
 * ambre et un mot qui dit quoi ; à zéro, « aucune », jamais un chiffre gris
 * qui se confondrait avec du calme. Une couverture de crawl très faible est
 * elle aussi une alerte, même quand bloquées et échecs valent zéro. */
function ligneAlertesTechniques(
  alertes: number | null,
  couvertureBasse: boolean,
): { texte: string; alarme: boolean } {
  if (couvertureBasse) return { texte: 'couverture du site très faible', alarme: true };
  if (alertes === null) return { texte: 'indisponible', alarme: false };
  if (alertes === 0) return { texte: 'aucune', alarme: false };
  return {
    texte: `${alertes.toLocaleString('fr-BE')} ${alertes > 1 ? 'alertes' : 'alerte'}`,
    alarme: true,
  };
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
  // rien. [] = bloc à jour, visitesIa un tableau vide : zéro constaté.
  const visitesIaListe: VisiteIa[] | null =
    umami.status === 'ok' && umami.donnees ? umami.donnees.visitesIa : null;

  // Red team (2026-09-20) : la tuile annonçait « Alertes techniques 0 »
  // pendant que la page listait des pages en 404/500, parce que la somme ne
  // comptait que les blocages Cloudflare et les échecs réseau, jamais les
  // pages récupérées avec un statut cassé (pagesCassees, partagée avec la
  // page pour que les deux affichages s'accordent toujours).
  const alertesBrutes =
    crawl.status === 'ok' && crawl.donnees
      ? sommeStricte([
          crawl.donnees.bloquees,
          crawl.donnees.echecs,
          crawl.donnees.pages === null ? null : pagesCassees(crawl.donnees.pages).length,
        ])
      : null;
  const couvertureBasse =
    crawl.status === 'ok' && crawl.donnees ? couvertureFaible(crawl.donnees.pages) : false;
  const alertesTechniques = ligneAlertesTechniques(alertesBrutes, couvertureBasse);

  // undefined = pas de mesure GSC exploitable (bloc en panne, ou « ok » mais
  // vide) : on ne sait pas s'il y a des actions, jamais « aucune action » par
  // défaut. Un tableau (même vide) = bloc réellement lisible.
  const actions: ActionSuggeree[] | undefined =
    gsc.status === 'ok' && gsc.donnees && gscMesurePresente(gsc.donnees)
      ? gsc.donnees.actions
      : undefined;
  // Déjà triées par priorité croissante (regles.mjs via seo-report.ts) :
  // la première ici est la plus urgente, pas la première écrite.
  const premiereAction = actions === undefined ? undefined : (actions[0] ?? null);

  const pannes = (
    [
      ligneEtat(NOMS_BLOCS.gsc, gsc),
      ligneEtat(NOMS_BLOCS.umami, umami),
      ligneEtat(NOMS_BLOCS.crawl, crawl),
    ] as const
  ).filter((ligne): ligne is string => ligne !== null);

  const fraicheur = pireFraicheurNommee([
    { nom: NOMS_BLOCS.gsc, freshness: rapport.fraicheur.gsc },
    { nom: NOMS_BLOCS.umami, freshness: rapport.fraicheur.umami },
    { nom: NOMS_BLOCS.crawl, freshness: rapport.fraicheur.crawl },
  ]);

  return (
    <Tile
      title="Rapport SEO hebdomadaire"
      href="/fr/admin/rapport"
      linkLabel="Ouvrir le rapport"
    >
      <TileStat
        value={actions === undefined ? 'indisponible' : actions.length}
        label={
          actions !== undefined && actions.length === 1
            ? 'action à traiter cette semaine'
            : 'actions à traiter cette semaine'
        }
      />

      <p className="mt-2 text-sm">
        {actions === undefined ? (
          <span className="text-neutral-600">indisponible</span>
        ) : premiereAction === null ? (
          <span className="text-neutral-600">Aucune action cette semaine.</span>
        ) : (
          <>
            <span className="block text-xs text-neutral-500">
              Première de {actions.length}{' '}
              {actions.length === 1 ? 'action suggérée' : 'actions suggérées'}
            </span>
            <Link
              href="/fr/admin/rapport#actions"
              className="break-words font-medium text-brand-700 underline-offset-4 hover:underline"
            >
              {premiereAction!.titre ?? `${premiereAction!.regle} : ${chemin(premiereAction!.url)}`}
            </Link>
          </>
        )}
      </p>

      <dl className="mt-4 space-y-1 border-t border-neutral-200 pt-3 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Clics Belgique</dt>
          <dd className="text-right tabular-nums text-neutral-700">
            {formatNombre(clicsBelgique)}
            {variation !== null && (
              // Red team (2026-09-20) : clicsBelgiquePrecedents est une
              // fenêtre de 28 jours, pas « la semaine précédente » — le
              // chiffre était juste, l'absence d'étiquette laissait croire
              // à une comparaison semaine sur semaine.
              <span
                className="ml-1 text-neutral-400"
                title="Comparé aux 28 jours précédents"
              >
                ({variation >= 0 ? '+' : ''}
                {variation.toLocaleString('fr-BE')} / 28 j)
              </span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Visites d&apos;assistants</dt>
          <dd className="text-right tabular-nums text-neutral-700">
            {ligneVisitesIa(visitesIaListe)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Alertes techniques</dt>
          <dd
            className={
              alertesTechniques.alarme
                ? 'text-right font-medium text-amber-700'
                : 'text-right tabular-nums text-neutral-700'
            }
          >
            {alertesTechniques.texte}
          </dd>
        </div>
      </dl>

      {fraicheur && (
        <p className={freshnessClassName(fraicheur.freshness.level)}>
          {fraicheur.nom} : {fraicheur.freshness.label}
        </p>
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
