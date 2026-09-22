// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Contrôle après build : le build a-t-il produit les pages que le contenu promet ?
 *
 * ⚑ LE TROU QUE CECI BOUCHE. Les routes de contenu déclarent
 * `dynamicParams = false` : seules les pages énumérées par `generateStaticParams`
 * existent, toute autre URL répond 404. Si l'énumération rendait une liste vide
 * ou incomplète (collection Velite vide, filtre de locale cassé, slug mal lu),
 * les pages manqueraient, tous les liens vers elles tomberaient en 404, et
 * `next build` resterait VERT : pour lui, zéro page à pré-rendre est un succès.
 *
 * ⚑ DEUX SOURCES INDÉPENDANTES.
 *
 * - L'ATTENDU se déduit des sorties Velite (`.velite/*.json`), en rejouant ce
 *   qu'énumère chaque `generateStaticParams`. Ce n'est volontairement PAS un
 *   appel à `generateStaticParams` : une panne dans cette fonction serait alors
 *   à la fois dans l'attendu et dans le produit, et passerait inaperçue.
 * - Le PRODUIT se lit dans `.next/prerender-manifest.json` (version 4 sous
 *   Next 16) : `routes` associe chaque chemin pré-rendu à sa route source
 *   (`srcRoute`). Le script vérifie en plus que le HTML existe sur disque.
 *
 * Si quelqu'un ajoute un filtre légitime à un `generateStaticParams` (exclure
 * les brouillons, par exemple), ce contrôle échouera : c'est voulu. Il faut
 * alors reporter le même filtre ici, en connaissance de cause.
 *
 * ⚑ BORNE BASSE. L'attendu et le produit peuvent être vides ensemble si la
 * panne est en amont des deux (Velite qui ne sort rien, par exemple). D'où
 * l'exigence d'au moins une page par route et par locale « minimale ».
 */

/** Nombre maximal de chemins manquants cités par ligne de rapport. */
export const MANQUANTS_CITES_MAX = 10;

/** Ce qu'on lit d'une entrée Velite. Tous les champs ne servent pas partout. */
export interface EntreeVelite {
  slug?: string;
  locale?: string;
  localizedSlugs?: Partial<Record<string, string>>;
  cardSlug?: string;
  date?: string;
  week?: string;
  lang?: string;
}

/** Les collections Velite dont dépend une route à `dynamicParams = false`. */
export interface CollectionsVelite {
  domainCards: EntreeVelite[];
  sectorCards: EntreeVelite[];
  solutionCards: EntreeVelite[];
  comparisonCards: EntreeVelite[];
  communeCards: EntreeVelite[];
  archivePages: EntreeVelite[];
  dossierCards: EntreeVelite[];
  verifications: EntreeVelite[];
  digestEntries: EntreeVelite[];
}

export interface PageAttendue {
  locale: string;
  chemin: string;
}

export interface RouteAttendue {
  /** La route source telle que Next la nomme dans le manifeste (`srcRoute`). */
  route: string;
  pages: PageAttendue[];
  /** Locales qui doivent porter au moins une page, quel que soit le contenu. */
  localesMinimales: readonly string[];
  /** Position de la locale dans le chemin découpé sur `/`. */
  segmentLocale: number;
}

export interface OptionsAttendu {
  locales: readonly string[];
  scrollyAutorises: ReadonlySet<string>;
  /** Ramène une date Velite à `AAAA-MM-JJ` (voir `src/lib/velite-date.ts`). */
  jour: (date: string) => string;
}

const unique = (valeurs: Array<string | undefined>): string[] =>
  [...new Set(valeurs.filter((v): v is string => typeof v === 'string' && v !== ''))];

/**
 * Routes « slug × toutes les locales » : `getAll*Slugs()` rend l'union des slugs
 * de la collection, sans filtre, et la page existe dans chaque locale (repli FR).
 */
const ROUTES_SIMPLES: Array<{ collection: keyof CollectionsVelite; segment: string }> = [
  { collection: 'domainCards', segment: 'domains' },
  { collection: 'sectorCards', segment: 'sectors' },
  { collection: 'solutionCards', segment: 'solutions' },
  { collection: 'comparisonCards', segment: 'comparisons' },
  { collection: 'communeCards', segment: 'communes' },
  { collection: 'archivePages', segment: 'archives' },
];

/** Locales dont on exige toujours au moins un numéro du digest. */
const LANGUES_DIGEST_MINIMALES = ['fr', 'nl', 'en', 'de'];

/**
 * Ce que le contenu promet, route par route. Rejoue chaque `generateStaticParams`
 * de `src/app/**` à dynamicParams = false ; toute divergence doit être voulue.
 */
export function pagesAttendues(c: CollectionsVelite, o: OptionsAttendu): RouteAttendue[] {
  const routes: RouteAttendue[] = [];

  for (const { collection, segment } of ROUTES_SIMPLES) {
    const slugs = unique(c[collection].map((e) => e.slug));
    routes.push({
      route: `/[locale]/${segment}/[slug]`,
      pages: o.locales.flatMap((locale) =>
        slugs.map((slug) => ({ locale, chemin: `/${locale}/${segment}/${slug}` })),
      ),
      localesMinimales: o.locales,
      segmentLocale: 1,
    });
  }

  // Dossiers : slug localisé de la carte FR quand il existe, sinon canonique.
  // Pas de filtre `draft` : `generateStaticParams` n'en applique pas.
  const dossiersFr = new Map<string, EntreeVelite>();
  for (const e of c.dossierCards) {
    if (e.locale === 'fr' && e.slug && !dossiersFr.has(e.slug)) dossiersFr.set(e.slug, e);
  }
  const dossiers: PageAttendue[] = [];
  for (const slug of unique(c.dossierCards.map((e) => e.slug))) {
    const fr = dossiersFr.get(slug);
    if (!fr) continue;
    for (const locale of o.locales) {
      dossiers.push({ locale, chemin: `/${locale}/dossiers/${fr.localizedSlugs?.[locale] ?? slug}` });
    }
  }
  routes.push({
    route: '/[locale]/dossiers/[slug]',
    pages: dossiers,
    localesMinimales: o.locales,
    segmentLocale: 1,
  });

  // Vue immersive : dossiers autorisés, dans les seules locales où la carte
  // existe nativement (pas de repli FR), avec le slug localisé de cette carte.
  const scrolly: PageAttendue[] = [];
  for (const slug of o.scrollyAutorises) {
    for (const locale of o.locales) {
      const carte = c.dossierCards.find((e) => e.slug === slug && e.locale === locale);
      if (!carte) continue;
      scrolly.push({
        locale,
        chemin: `/${locale}/dossiers/${carte.localizedSlugs?.[locale] ?? slug}/scrolly`,
      });
    }
  }
  routes.push({
    route: '/[locale]/dossiers/[slug]/scrolly',
    pages: scrolly,
    // Les traductions d'une vue immersive sont facultatives : seul le FR est exigé.
    localesMinimales: o.scrollyAutorises.size > 0 ? ['fr'] : [],
    segmentLocale: 1,
  });

  // Vérifications : une page par fiche réellement présente dans la locale.
  routes.push({
    route: '/[locale]/verifications/[slug]',
    pages: c.verifications
      .filter((v) => v.locale && v.cardSlug && v.date)
      .map((v) => ({
        locale: v.locale as string,
        chemin: `/${v.locale}/verifications/${v.cardSlug}-${o.jour(v.date as string)}`,
      })),
    localesMinimales: o.locales,
    segmentLocale: 1,
  });

  // Digest : produit cartésien semaines × langues, comme `generateStaticParams`.
  const semaines = unique(c.digestEntries.map((e) => e.week));
  const langues = unique(c.digestEntries.map((e) => e.lang));
  routes.push({
    route: '/digest/[lang]/[year]/[week]',
    pages: semaines.flatMap((semaine) => {
      const [annee, numero] = semaine.split('-w');
      return langues.map((lang) => ({ locale: lang, chemin: `/digest/${lang}/${annee}/w${numero}` }));
    }),
    localesMinimales: LANGUES_DIGEST_MINIMALES,
    segmentLocale: 2,
  });

  return routes;
}

/** Forme minimale de `.next/prerender-manifest.json` dont on a besoin. */
export interface ManifestePrerendu {
  routes: Record<string, { srcRoute?: string | null }>;
  notFoundRoutes?: string[];
}

/**
 * Chemins réellement pré-rendus, regroupés par route source. Une page que le
 * manifeste liste mais dont le HTML est absent (`existe` rend faux) ne compte
 * pas, ni une page pré-rendue en 404 (`notFoundRoutes`).
 */
export function pagesProduites(
  manifeste: ManifestePrerendu,
  existe: (chemin: string) => boolean = () => true,
): Map<string, Set<string>> {
  const introuvables = new Set(manifeste.notFoundRoutes ?? []);
  const parRoute = new Map<string, Set<string>>();
  for (const [chemin, entree] of Object.entries(manifeste.routes)) {
    const route = entree.srcRoute;
    if (!route || introuvables.has(chemin) || !existe(chemin)) continue;
    let chemins = parRoute.get(route);
    if (!chemins) parRoute.set(route, (chemins = new Set()));
    chemins.add(chemin);
  }
  return parRoute;
}

export interface LigneRapport {
  route: string;
  locale: string;
  attendu: number;
  produit: number;
  manquants: string[];
  /** Vrai si la locale est exigée et qu'aucune page n'y a été produite. */
  sousBorneBasse: boolean;
}

export interface Rapport {
  lignes: LigneRapport[];
  /** Pages produites que l'attendu ne prévoit pas : signe que ce fichier a dérivé. */
  enTrop: Array<{ route: string; chemin: string }>;
  ok: boolean;
}

/** Compare, par route et par locale, l'attendu au produit. */
export function comparer(attendus: RouteAttendue[], produites: Map<string, Set<string>>): Rapport {
  const lignes: LigneRapport[] = [];
  const enTrop: Rapport['enTrop'] = [];

  for (const r of attendus) {
    const produit = produites.get(r.route) ?? new Set<string>();
    const attenduParChemin = new Set(r.pages.map((p) => p.chemin));
    const localeDe = (chemin: string) => chemin.split('/')[r.segmentLocale] ?? '';

    const locales = unique([
      ...r.localesMinimales,
      ...r.pages.map((p) => p.locale),
      ...[...produit].map(localeDe),
    ]).sort();

    for (const locale of locales) {
      const attendusLocale = r.pages.filter((p) => p.locale === locale);
      const produitsLocale = [...produit].filter((ch) => localeDe(ch) === locale);
      lignes.push({
        route: r.route,
        locale,
        attendu: attendusLocale.length,
        produit: produitsLocale.length,
        manquants: attendusLocale.map((p) => p.chemin).filter((ch) => !produit.has(ch)).sort(),
        sousBorneBasse: r.localesMinimales.includes(locale) && produitsLocale.length === 0,
      });
    }

    for (const chemin of [...produit].sort()) {
      if (!attenduParChemin.has(chemin)) enTrop.push({ route: r.route, chemin });
    }
  }

  const ok = lignes.every((l) => l.manquants.length === 0 && !l.sousBorneBasse);
  return { lignes, enTrop, ok };
}

/** Lignes lisibles pour la sortie console : les fautes d'abord, détaillées. */
export function formaterRapport(rapport: Rapport): string[] {
  const sortie: string[] = [];
  for (const l of rapport.lignes) {
    const fautive = l.manquants.length > 0 || l.sousBorneBasse;
    const etat = fautive ? 'ÉCHEC' : 'ok   ';
    sortie.push(`${etat} ${l.route} [${l.locale}] attendu ${l.attendu}, produit ${l.produit}`);
    if (l.sousBorneBasse) {
      sortie.push(`      aucune page produite dans une locale exigée (borne basse : au moins 1)`);
    }
    if (l.manquants.length > 0) {
      sortie.push(`      ${l.manquants.length} manquante(s) :`);
      for (const ch of l.manquants.slice(0, MANQUANTS_CITES_MAX)) sortie.push(`        ${ch}`);
      if (l.manquants.length > MANQUANTS_CITES_MAX) {
        sortie.push(`        … et ${l.manquants.length - MANQUANTS_CITES_MAX} autre(s)`);
      }
    }
  }
  if (rapport.enTrop.length > 0) {
    sortie.push(
      `avertissement : ${rapport.enTrop.length} page(s) produite(s) hors attendu ; ` +
        `src/lib/controle-build.ts ne rejoue plus fidèlement un generateStaticParams :`,
    );
    for (const { route, chemin } of rapport.enTrop.slice(0, MANQUANTS_CITES_MAX)) {
      sortie.push(`        ${route} ${chemin}`);
    }
  }
  return sortie;
}
