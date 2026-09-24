// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde « page publiée disparue sans redirection ».
 *
 * velite.config.ts (champ `localizedSlugs` des dossiers) et
 * src/lib/redirects-301.ts posent une règle MANDATORY : un changement qui
 * modifie l'URL effective d'une page doit livrer, dans le même commit, une
 * redirection permanente de l'ancienne URL vers la nouvelle. Sinon les liens
 * externes (presse, partages, favoris) tombent en 404 sans aucun signal. Ce
 * module compare les URL servies AVANT et APRÈS et exige, pour chaque URL
 * perdue, l'entrée de table correspondante (ou un retrait explicite).
 *
 * Couvert depuis le 24/09/2026 : toutes les routes `src/app/[locale]/…/[slug]`
 * adossées à une collection de contenu (voir PAGE_TYPES), plus un changement
 * de SEGMENT localisé dans src/i18n/routing.ts (ex. `/fr/secteurs` renommé),
 * qui déplace d'un coup toutes les pages du type dans cette langue.
 *
 * Fonctions pures : le script scripts/content-lint/slug-redirects.ts lit git
 * et le disque (deux révisions, sans build Velite), puis appelle
 * `checkSlugRedirects`.
 *
 * ── Modèle des URL servies, recopié des routes (toutes en dynamicParams = false)
 *
 * Segment : la valeur de routing.ts `pathnames['/{type}/[slug]'][L]`, ex.
 * `/domaines/[slug]` en français, `/domeinen/[slug]` en néerlandais. L'URL
 * servie est `/{L}` + ce gabarit où `[slug]` est remplacé.
 *
 * - dossiers (`dossier`) : pour chaque carte FR, `/{L}/dossiers/{getLocalizedSlug(carteFR, L)}`
 *   dans les quatre langues ; la page ne rend que si `findDossierByLocalizedSlug`
 *   (content.ts, fonction pure réutilisée ici) la retrouve. Vue immersive : pour chaque dossier de
 *   SCROLLY_ENABLED_DOSSIERS et chaque langue où la carte existe nativement,
 *   `/{L}/dossiers/{carte.localizedSlugs[L] ?? slug}/scrolly` (chemin interne,
 *   absent de routing.ts, donc jamais localisé).
 * - domaines, solutions, secteurs, comparaisons, communes, archives
 *   (`fallback-fr`) : generateStaticParams émet chaque slug présent dans
 *   N'IMPORTE QUELLE langue (`getAll…Slugs`, dédoublonné) pour les quatre
 *   langues ; la page rend la carte de la langue, sinon la carte FR
 *   (`get…Card`, `getArchivePage`), sinon 404. Un slug sans carte FR n'est
 *   donc servi que dans les langues où il a une carte.
 * - vérifications (`native-only`) : une URL par fiche, dans SA langue
 *   seulement (`getVerificationSlugs(locale)`), identifiant
 *   `idDeVerification` = `{cardSlug}-{AAAA-MM-JJ}` : le champ `slug` du
 *   frontmatter n'entre pas dans l'URL.
 *
 * `draft` n'est filtré par aucune de ces routes (les pages affichent un
 * bandeau) : une fiche en brouillon est servie, et la supprimer perd une URL.
 */

// Accesseurs PURS de content.ts, réutilisés tels quels (aucun ne lit la sortie
// Velite : getCollections() n'est appelé que par les autres fonctions).
import { findDossierByLocalizedSlug, getLocalizedSlug, idDeVerification, type DossierCard } from './content';
import type { Locale } from '@/i18n/routing';

// ── Types de pages ──────────────────────────────────────────────────────

export type ServeModel = 'dossier' | 'fallback-fr' | 'native-only';

export interface PageTypeSpec {
  /** Dossier de contenu lu par Velite (pattern `{dir}/*.mdx`). */
  dir: string;
  /** Clé interne dans routing.ts pathnames, et chemin de la route sous src/app/[locale]. */
  route: string;
  model: ServeModel;
}

/**
 * Toutes les routes `[slug]` adossées à du contenu. Un test vérifie que cette
 * table couvre exactement les dossiers `src/app/[locale]/…/[slug]` et les
 * entrées `[slug]` de routing.ts, et que chaque page appelle bien les
 * accesseurs que son modèle suppose : une route ajoutée ou modifiée sans
 * mettre ce modèle à jour fait échouer les tests.
 */
export const PAGE_TYPES = {
  dossiers: { dir: 'content/dossiers', route: '/dossiers/[slug]', model: 'dossier' },
  domains: { dir: 'content/domain-cards', route: '/domains/[slug]', model: 'fallback-fr' },
  solutions: { dir: 'content/solution-cards', route: '/solutions/[slug]', model: 'fallback-fr' },
  sectors: { dir: 'content/sector-cards', route: '/sectors/[slug]', model: 'fallback-fr' },
  comparisons: { dir: 'content/comparison-cards', route: '/comparisons/[slug]', model: 'fallback-fr' },
  communes: { dir: 'content/commune-cards', route: '/communes/[slug]', model: 'fallback-fr' },
  archives: { dir: 'content/archive-pages', route: '/archives/[slug]', model: 'fallback-fr' },
  verifications: { dir: 'content/verifications', route: '/verifications/[slug]', model: 'native-only' },
} as const satisfies Record<string, PageTypeSpec>;

export type PageType = keyof typeof PAGE_TYPES;
export const PAGE_TYPE_NAMES = Object.keys(PAGE_TYPES) as PageType[];

/** Une fiche de contenu, lue dans le frontmatter brut. */
export interface ContentEntry {
  /** Chemin du fichier, ex. content/dossiers/cpas-bruxellois.fr.mdx */
  file: string;
  locale: string;
  slug: string;
  /** Dossiers seulement. */
  localizedSlugs?: Partial<Record<string, string>>;
  /** Vérifications seulement : l'URL en dérive. */
  cardSlug?: string;
  date?: string;
  /** Informatif : aucune route ne filtre les brouillons. */
  draft?: boolean;
}

/** @deprecated nom d'origine, du temps où seuls les dossiers étaient gardés. */
export type DossierSlugInfo = ContentEntry;

/** Gabarits par langue d'une route, ex. { fr: '/domaines/[slug]', nl: '/domeinen/[slug]', … }. */
export type RouteTemplates = Partial<Record<string, string>>;

export interface SlugSnapshot {
  entries: Partial<Record<PageType, ContentEntry[]>>;
  /** Gabarits de routing.ts pathnames pour chaque type, dans cette révision. */
  routes: Partial<Record<PageType, RouteTemplates>>;
  scrollyAllowlist: ReadonlySet<string>;
}

export interface Redirect {
  from: string;
  to: string;
}

export interface RetiredUrl {
  path: string;
  raison: string;
}

export interface SlugRedirectInput {
  locales: readonly string[];
  before: SlugSnapshot;
  after: SlugSnapshot;
  /** Renommages de fichiers de contenu détectés par git : ancien chemin → nouveau. */
  renames?: ReadonlyMap<string, string>;
  /** Table de redirections telle qu'elle sera déployée (arbre de travail). */
  redirects: readonly Redirect[];
  /** URL retirées volontairement, sans redirection (décision explicite). */
  retired: readonly RetiredUrl[];
  /**
   * Pages statiques servies après la PR (index des types, chronologie…) :
   * cibles de redirection admises en plus des pages de contenu.
   */
  staticPages?: readonly string[];
}

export type ViolationKind =
  | 'missing-redirect'
  | 'segment-changed'
  | 'wrong-target'
  | 'deleted-without-decision'
  | 'unrenderable-page'
  | 'route-missing'
  | 'invalid-path'
  | 'locale-mismatch'
  | 'duplicate-from'
  | 'self-redirect'
  | 'chain'
  | 'loop'
  | 'target-missing'
  | 'shadows-live-page'
  | 'invalid-retired';

export interface Violation {
  kind: ViolationKind;
  message: string;
  /** Entrée exacte à ajouter à SLUG_REDIRECTS_301, quand elle est connue. */
  fix?: Redirect;
}

type Kind = 'page' | 'scrolly';

export interface ServedUrl {
  url: string;
  /** Identité stable : type, fichier de référence, langue, variante. */
  key: string;
  type: PageType;
  /** Fichier de référence (FR si elle existe), suivi à travers les renommages. */
  file: string;
  locale: string;
  kind: Kind;
  /** Segment d'URL final (le slug servi). */
  slug: string;
}

export interface ServedResult {
  served: ServedUrl[];
  /** URL émises par generateStaticParams mais que la page ne sait pas rendre (404). */
  unrenderable: ServedUrl[];
  /** Types dont le gabarit manque dans routing.ts pour une langue. */
  missingRoutes: Array<{ type: PageType; locale: string }>;
}

const keyOf = (type: PageType, file: string, locale: string, kind: Kind) =>
  `${type}\u0000${file}\u0000${locale}\u0000${kind}`;

const urlOf = (locale: string, template: string, slug: string) =>
  `/${locale}${template.replace('[slug]', slug)}`;

/** Préfixe d'un gabarit, ex. `/domaines/[slug]` → `/domaines`. */
const prefixOf = (template: string) => template.replace(/\/\[slug\].*$/, '');

// ── Dossiers ────────────────────────────────────────────────────────────

/** getLocalizedSlug (content.ts) : slug localisé de la carte, sinon canonique. */
const effectiveSlug = (card: ContentEntry, locale: string): string =>
  getLocalizedSlug(card as unknown as DossierCard, locale as Locale);

/** La page rend-elle ce slug ? Même fonction que la route (getDossierByLocalizedSlug). */
function dossierRenders(dossiers: ContentEntry[], slugFromUrl: string, locale: string): boolean {
  return findDossierByLocalizedSlug(dossiers as unknown as DossierCard[], slugFromUrl, locale as Locale) !== null;
}

function servedDossiers(
  dossiers: ContentEntry[],
  templates: RouteTemplates,
  scrollyAllowlist: ReadonlySet<string>,
  locales: readonly string[],
  out: ServedResult,
): void {
  const seenSlugs = new Set<string>();
  for (const fr of dossiers) {
    if (fr.locale !== 'fr' || seenSlugs.has(fr.slug)) continue;
    // getDossierCard(slug, 'fr') prend la première carte FR de ce slug.
    seenSlugs.add(fr.slug);
    for (const locale of locales) {
      const tpl = templates[locale];
      if (!tpl) continue; // signalé par l'appelant (route-missing)
      const slug = effectiveSlug(fr, locale);
      const entry: ServedUrl = {
        url: urlOf(locale, tpl, slug),
        key: keyOf('dossiers', fr.file, locale, 'page'),
        type: 'dossiers',
        file: fr.file,
        locale,
        kind: 'page',
        slug,
      };
      (dossierRenders(dossiers, slug, locale) ? out.served : out.unrenderable).push(entry);
    }
  }
  // Vue immersive : scrolly/page.tsx parcourt la LISTE (pas les cartes FR) et
  // émet chaque langue où getDossierCard(slug, L) existe sans repli.
  for (const canonical of scrollyAllowlist) {
    const cards = dossiers.filter((c) => c.slug === canonical);
    if (cards.length === 0) continue;
    const ref = cards.find((c) => c.locale === 'fr') ?? [...cards].sort((a, b) => a.file.localeCompare(b.file))[0]!;
    for (const locale of locales) {
      const native = cards.find((c) => c.locale === locale);
      if (!native) continue;
      const slug = effectiveSlug(native, locale);
      out.served.push({
        // Chemin INTERNE : la vue immersive n'est pas dans routing.ts.
        url: `/${locale}/dossiers/${slug}/scrolly`,
        key: keyOf('dossiers', ref.file, locale, 'scrolly'),
        type: 'dossiers',
        file: ref.file,
        locale,
        kind: 'scrolly',
        slug,
      });
    }
  }
}

// ── Fiches avec repli FR ────────────────────────────────────────────────

function servedFallbackFr(
  type: PageType,
  entries: ContentEntry[],
  templates: RouteTemplates,
  locales: readonly string[],
  out: ServedResult,
): void {
  // getAll…Slugs() : tous les slugs, toutes langues, brouillons compris.
  const slugs = [...new Set(entries.map((e) => e.slug))];
  for (const slug of slugs) {
    const cards = entries.filter((e) => e.slug === slug);
    const fr = cards.find((e) => e.locale === 'fr');
    // Identité : la carte FR (suivie à travers un renommage de fichier), à
    // défaut le premier fichier du slug.
    const ref = fr ?? [...cards].sort((a, b) => a.file.localeCompare(b.file))[0]!;
    for (const locale of locales) {
      const tpl = templates[locale];
      if (!tpl) continue;
      const entry: ServedUrl = {
        url: urlOf(locale, tpl, slug),
        key: keyOf(type, ref.file, locale, 'page'),
        type,
        file: ref.file,
        locale,
        kind: 'page',
        slug,
      };
      // get…Card(slug, locale) : carte de la langue, sinon carte FR, sinon null → notFound().
      const renders = Boolean(fr) || cards.some((e) => e.locale === locale);
      (renders ? out.served : out.unrenderable).push(entry);
    }
  }
}

// ── Vérifications ───────────────────────────────────────────────────────

function servedNativeOnly(
  type: PageType,
  entries: ContentEntry[],
  templates: RouteTemplates,
  out: ServedResult,
): void {
  const seen = new Set<string>();
  for (const e of entries) {
    const tpl = templates[e.locale];
    if (!tpl) continue;
    // Même fonction que la route (getVerificationSlugs → idDeVerification).
    const slug = idDeVerification({ cardSlug: e.cardSlug ?? '', date: e.date ?? '' });
    const url = urlOf(e.locale, tpl, slug);
    if (seen.has(url)) continue;
    seen.add(url);
    out.served.push({ url, key: keyOf(type, e.file, e.locale, 'page'), type, file: e.file, locale: e.locale, kind: 'page', slug });
  }
}

/** URL de contenu réellement servies pour un état du dépôt. */
export function servedUrls(snapshot: SlugSnapshot, locales: readonly string[]): ServedResult {
  const out: ServedResult = { served: [], unrenderable: [], missingRoutes: [] };
  for (const type of PAGE_TYPE_NAMES) {
    const entries = snapshot.entries[type] ?? [];
    const templates = snapshot.routes[type] ?? {};
    if (entries.length > 0) {
      for (const locale of locales) if (!templates[locale]) out.missingRoutes.push({ type, locale });
    }
    const spec: PageTypeSpec = PAGE_TYPES[type];
    if (spec.model === 'dossier') servedDossiers(entries, templates, snapshot.scrollyAllowlist, locales, out);
    else if (spec.model === 'fallback-fr') servedFallbackFr(type, entries, templates, locales, out);
    else servedNativeOnly(type, entries, templates, out);
  }
  return out;
}

/** Nombre d'URL servies par type, pour la sortie « OK » (jamais silencieuse). */
export function countByType(served: readonly ServedUrl[]): Record<PageType, number> {
  const counts = Object.fromEntries(PAGE_TYPE_NAMES.map((t) => [t, 0])) as Record<PageType, number>;
  for (const s of served) counts[s.type]++;
  return counts;
}

// ── Table de redirections ───────────────────────────────────────────────

/**
 * Entrée exacte : chemin absolu préfixé par une langue, sans barre finale, sans
 * requête ni ancre, et sans aucun caractère que Next interprète comme motif
 * (`: ( ) { } * + ?`) : une entrée « exacte » qui en contiendrait serait
 * silencieusement un motif.
 */
const EXACT_RE = /^\/([a-z]{2})(?:\/[^/\s?#:(){}*+\\]+)+$/;
/**
 * Entrée générique, pour un segment localisé renommé : `/{L}/{segment}/:slug`
 * des deux côtés. Next l'applique telle quelle (next.config redirects(), path
 * matching : `:slug` = exactement un segment, sans sous-chemin).
 */
const PATTERN_RE = /^\/([a-z]{2})((?:\/[^/\s?#:(){}*+\\]+)+)\/:slug$/;

interface ParsedRedirect extends Redirect {
  index: number;
  pattern: boolean;
  locale: string;
  /** Motif : préfixe avant `/:slug` de chaque côté. */
  fromPrefix?: string;
  toPrefix?: string;
}

function parseEntry(r: Redirect, index: number): ParsedRedirect | null {
  const ef = EXACT_RE.exec(r.from);
  const et = EXACT_RE.exec(r.to);
  if (ef && et) return { ...r, index, pattern: false, locale: ef[1]! };
  const pf = PATTERN_RE.exec(r.from);
  const pt = PATTERN_RE.exec(r.to);
  if (pf && pt) {
    return {
      ...r,
      index,
      pattern: true,
      locale: pf[1]!,
      fromPrefix: r.from.slice(0, -'/:slug'.length),
      toPrefix: r.to.slice(0, -'/:slug'.length),
    };
  }
  return null;
}

/** Cible de l'entrée pour ce chemin, ou null si elle ne s'applique pas. */
function applyEntry(e: ParsedRedirect, url: string): string | null {
  if (!e.pattern) return url === e.from ? e.to : null;
  const head = `${e.fromPrefix}/`;
  if (!url.startsWith(head)) return null;
  const rest = url.slice(head.length);
  if (!rest || rest.includes('/')) return null;
  return `${e.toPrefix}/${rest}`;
}

/** Comme Next : la PREMIÈRE entrée de la table qui correspond l'emporte. */
function firstMatch(table: readonly ParsedRedirect[], url: string): { entry: ParsedRedirect; to: string } | null {
  for (const e of table) {
    const to = applyEntry(e, url);
    if (to !== null) return { entry: e, to };
  }
  return null;
}

interface Resolution {
  hops: string[];
  final: string;
  first: ParsedRedirect;
  loop: boolean;
}

/** Suit les redirections depuis `url` ; null si aucune ne s'applique. */
function resolve(table: readonly ParsedRedirect[], url: string): Resolution | null {
  const m = firstMatch(table, url);
  if (!m) return null;
  const hops = [url];
  let cur = m.to;
  let loop = false;
  for (;;) {
    if (hops.includes(cur)) {
      loop = true;
      break;
    }
    const next = firstMatch(table, cur);
    if (!next) break;
    hops.push(cur);
    cur = next.to;
  }
  return { hops, final: cur, first: m.entry, loop };
}

const fmt = (r: Redirect) => `{ from: '${r.from}', to: '${r.to}' },`;

/**
 * Contrôle complet. Rend la liste des violations ; vide = conforme.
 */
export function checkSlugRedirects(input: SlugRedirectInput): Violation[] {
  const { locales, redirects, retired } = input;
  const renames = input.renames ?? new Map<string, string>();
  const violations: Violation[] = [];

  const before = servedUrls(input.before, locales).served;
  const afterResult = servedUrls(input.after, locales);
  const after = afterResult.served;
  const afterByKey = new Map(after.map((s) => [s.key, s]));
  const contentUrls = new Set(after.map((s) => s.url));
  const liveUrls = new Set([...contentUrls, ...(input.staticPages ?? [])]);

  for (const m of afterResult.missingRoutes) {
    violations.push({
      kind: 'route-missing',
      message: `src/i18n/routing.ts ne déclare plus de chemin ${m.locale.toUpperCase()} pour ${PAGE_TYPES[m.type].route} : les fiches ${m.type} n'auraient plus d'URL dans cette langue.`,
    });
  }

  for (const u of afterResult.unrenderable) {
    violations.push({
      kind: 'unrenderable-page',
      message:
        u.type === 'dossiers'
          ? `${u.url} est annoncée par la carte FR (${u.file}) mais la page répond 404 : ` +
            `la carte ${u.locale.toUpperCase()} doit déclarer le même localizedSlugs.${u.locale}, ` +
            `et une carte sans traduction ${u.locale.toUpperCase()} ne peut pas porter de slug localisé dans cette langue.`
          : `${u.url} est générée (slug « ${u.slug} » présent dans ${u.file}) mais la page répond 404 : ` +
            `ni carte ${u.locale.toUpperCase()} ni carte FR de repli. Ajouter la carte FR de ce slug.`,
    });
  }

  // ── 1. Table elle-même ────────────────────────────────────────────────
  const table: ParsedRedirect[] = [];
  const byFrom = new Map<string, ParsedRedirect>();
  redirects.forEach((r, index) => {
    const p = parseEntry(r, index);
    if (!p || !locales.includes(p.locale)) {
      violations.push({
        kind: 'invalid-path',
        message:
          `Entrée ${fmt(r)} : chaque côté doit être un chemin absolu préfixé par une langue (/${locales.join('|/')}/…), ` +
          `sans barre finale, requête, ancre ni caractère de motif ; ou, pour un segment renommé, ` +
          `un motif /{langue}/{segment}/:slug des DEUX côtés.`,
      });
      return;
    }
    const lt = (p.pattern ? PATTERN_RE : EXACT_RE).exec(r.to)![1]!;
    if (p.locale !== lt) {
      violations.push({
        kind: 'locale-mismatch',
        message: `Entrée ${fmt(r)} : la langue change (${p.locale} → ${lt}). Une redirection de slug reste dans sa langue.`,
      });
    }
    if (r.from === r.to) {
      violations.push({ kind: 'self-redirect', message: `Entrée ${fmt(r)} : redirige vers elle-même.` });
      return;
    }
    if (byFrom.has(r.from)) {
      violations.push({
        kind: 'duplicate-from',
        message: `Deux entrées partent de ${r.from} : garder une seule entrée par ancienne URL.`,
      });
      return;
    }
    // Entrée exacte placée APRÈS un motif qui la couvre : Next ne l'atteint jamais.
    if (!p.pattern) {
      const shadow = table.find((e) => e.pattern && applyEntry(e, r.from) !== null);
      if (shadow) {
        violations.push({
          kind: 'duplicate-from',
          message: `Entrée ${fmt(r)} jamais appliquée : l'entrée générique ${fmt(shadow)} placée avant elle couvre déjà ${r.from}. Placer l'entrée exacte AVANT l'entrée générique.`,
        });
        return;
      }
    }
    byFrom.set(r.from, p);
    table.push(p);
  });

  const reportedCycles = new Set<string>();
  const chainReported = new Set<string>();
  for (const e of table) {
    // Un motif se suit sur son propre gabarit : `/fr/a/:slug` → `/fr/b/:slug`.
    const res = resolve(table, e.from);
    if (!res || (res.hops.length === 1 && !res.loop)) continue;
    if (res.loop) {
      const cycle = [...res.hops].sort().join(' → ');
      if (reportedCycles.has(cycle)) continue;
      reportedCycles.add(cycle);
      violations.push({
        kind: 'loop',
        message: `Boucle de redirections : ${res.hops.join(' → ')} → ${res.final}. Le navigateur abandonnerait.`,
      });
      continue;
    }
    const fix = { from: e.from, to: res.final };
    chainReported.add(e.from);
    violations.push({
      kind: 'chain',
      message:
        `Chaîne de redirections : ${res.hops.join(' → ')} → ${res.final}. ` +
        `Une redirection doit mener directement à la page finale : remplacer l'entrée de ${e.from} par ${fmt(fix)}`,
      fix,
    });
  }

  // Préfixes de pages de contenu servies, par langue : cibles admises d'un motif.
  const contentPrefixes = new Set<string>();
  for (const type of PAGE_TYPE_NAMES) {
    for (const [locale, tpl] of Object.entries(input.after.routes[type] ?? {})) {
      if (tpl) contentPrefixes.add(`/${locale}${prefixOf(tpl)}`);
    }
  }

  for (const e of table) {
    if (!e.pattern) {
      if (liveUrls.has(e.from)) {
        violations.push({
          kind: 'shadows-live-page',
          message: `Entrée ${fmt(e)} : ${e.from} est une page servie. next.config applique les redirections avant les routes, elle deviendrait inaccessible.`,
        });
      }
    } else {
      const hidden = [...liveUrls].filter((u) => applyEntry(e, u) !== null);
      if (hidden.length > 0) {
        violations.push({
          kind: 'shadows-live-page',
          message: `Entrée générique ${fmt(e)} : elle capterait ${hidden.length} page(s) servie(s), dont ${hidden.slice(0, 3).join(', ')}. next.config applique les redirections avant les routes.`,
        });
      }
    }
    if (firstMatch(table, e.to)) continue; // déjà signalé comme chaîne ou boucle
    if (e.pattern) {
      if (!contentPrefixes.has(e.toPrefix!)) {
        violations.push({
          kind: 'target-missing',
          message: `Entrée générique ${fmt(e)} : ${e.toPrefix}/… n'est le chemin d'aucun type de page de contenu (routing.ts).`,
        });
      }
    } else if (!liveUrls.has(e.to)) {
      violations.push({
        kind: 'target-missing',
        message:
          `Entrée ${fmt(e)} : la cible ${e.to} n'est pas une page servie ` +
          `(page de contenu, index ou page statique de routing.ts).`,
      });
    }
  }

  const retiredPaths = new Set<string>();
  for (const r of retired) {
    const rl = EXACT_RE.exec(r.path)?.[1];
    if (!rl || !locales.includes(rl) || !r.raison?.trim()) {
      violations.push({
        kind: 'invalid-retired',
        message: `URL retirée « ${r.path} » : chemin préfixé par une langue et raison non vide obligatoires.`,
      });
      continue;
    }
    if (liveUrls.has(r.path)) {
      violations.push({ kind: 'invalid-retired', message: `URL retirée ${r.path} : elle est encore servie.` });
    }
    if (firstMatch(table, r.path)) {
      violations.push({
        kind: 'invalid-retired',
        message: `URL ${r.path} à la fois retirée et redirigée : choisir l'un des deux.`,
      });
    }
    retiredPaths.add(r.path);
  }

  // ── 2. URL perdues entre la base et la branche ───────────────────────
  /** Segment localisé renommé : une entrée générique suffit, un message par (type, langue). */
  const segmentGroups = new Map<string, { type: PageType; locale: string; fix: Redirect; urls: string[] }>();

  for (const old of before) {
    if (contentUrls.has(old.url)) continue;

    const file = renames.get(old.file) ?? old.file;
    const successor =
      afterByKey.get(keyOf(old.type, file, old.locale, old.kind)) ??
      // Vue immersive retirée : la page du dossier est la suite naturelle.
      (old.kind === 'scrolly' ? afterByKey.get(keyOf(old.type, file, old.locale, 'page')) : undefined);

    const res = resolve(table, old.url);

    if (successor) {
      const fix = { from: old.url, to: successor.url };
      if (!res) {
        const tplBefore = input.before.routes[old.type]?.[old.locale];
        const tplAfter = input.after.routes[old.type]?.[old.locale];
        if (
          old.kind === 'page' &&
          tplBefore &&
          tplAfter &&
          tplBefore !== tplAfter &&
          successor.slug === old.slug &&
          /\/\[slug\]$/.test(tplBefore) &&
          /\/\[slug\]$/.test(tplAfter)
        ) {
          const g = `${old.type}\u0000${old.locale}`;
          const group = segmentGroups.get(g) ?? {
            type: old.type,
            locale: old.locale,
            fix: {
              from: `/${old.locale}${prefixOf(tplBefore)}/:slug`,
              to: `/${old.locale}${prefixOf(tplAfter)}/:slug`,
            },
            urls: [],
          };
          group.urls.push(old.url);
          segmentGroups.set(g, group);
          continue;
        }
        violations.push({
          kind: 'missing-redirect',
          message: `${old.url} n'est plus servie (nouvelle URL : ${successor.url}). Ajouter dans SLUG_REDIRECTS_301 (src/lib/redirects-301.ts) : ${fmt(fix)}`,
          fix,
        });
      } else if (res.final !== successor.url) {
        violations.push({
          kind: 'wrong-target',
          message:
            `${old.url} redirige vers ${res.final}, mais la page est désormais ${successor.url}. ` +
            (res.first.pattern
              ? `Ajouter AVANT l'entrée générique ${fmt(res.first)} l'entrée exacte : ${fmt(fix)}`
              : `Remplacer l'entrée par : ${fmt(fix)}`),
          fix,
        });
      } else if (res.hops.length > 1 && !chainReported.has(res.first.from)) {
        violations.push({
          kind: 'chain',
          message: `${old.url} atteint ${successor.url} en ${res.hops.length} redirections (${res.hops.join(' → ')} → ${res.final}). Ajouter une entrée directe AVANT les autres : ${fmt(fix)}`,
          fix,
        });
      }
      continue;
    }

    // Fiche supprimée (ou carte de référence disparue) : aucune suite évidente.
    if (res || retiredPaths.has(old.url)) continue;
    const tpl = input.after.routes[old.type]?.[old.locale];
    const index = tpl ? `/${old.locale}${prefixOf(tpl)}` : undefined;
    const example = index && liveUrls.has(index) ? index : '/…';
    violations.push({
      kind: 'deleted-without-decision',
      message:
        `${old.url} n'est plus servie et sa fiche (${old.file}) a disparu. Décision explicite requise : ` +
        `soit une redirection dans SLUG_REDIRECTS_301, ex. { from: '${old.url}', to: '${example}' }, ` +
        `soit une entrée { path: '${old.url}', raison: '…' } dans URLS_RETIREES (src/lib/redirects-301.ts).`,
    });
  }

  for (const g of segmentGroups.values()) {
    violations.push({
      kind: 'segment-changed',
      message:
        `Le chemin ${g.locale.toUpperCase()} de ${PAGE_TYPES[g.type].route} a changé dans src/i18n/routing.ts : ` +
        `${g.urls.length} page(s) ${g.type} ne sont plus servies (ex. ${g.urls[0]}). ` +
        `Une seule entrée générique les redirige toutes : ${fmt(g.fix)}`,
      fix: g.fix,
    });
  }

  return violations;
}

// ── Lecture des sources (texte des deux révisions) ─────────────────────

/**
 * Lit la liste SCROLLY_ENABLED_DOSSIERS dans le SOURCE de
 * src/lib/scrolly-allowlist.ts (la version de la branche de base n'est
 * disponible qu'en texte). Rend null si le bloc est introuvable : l'appelant
 * doit échouer, pas supposer une liste vide.
 */
export function parseScrollyAllowlist(source: string): Set<string> | null {
  const m = /SCROLLY_ENABLED_DOSSIERS[^=]*=\s*new Set\(\s*\[([\s\S]*?)\]\s*\)/.exec(source);
  if (!m) return null;
  const body = m[1]!.replace(/\/\/.*$/gm, '');
  return new Set([...body.matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]!));
}

/**
 * Lit, dans le SOURCE de src/i18n/routing.ts, les chemins localisés des routes
 * `[slug]` : `'/domains/[slug]': { fr: '/domaines/[slug]', … }` ou
 * `'/dossiers/[slug]': '/dossiers/[slug]'` (même chemin dans toutes les
 * langues). Rend null si le bloc `pathnames` est introuvable. Un test vérifie
 * que la lecture du fichier réel égale l'objet `routing` importé.
 */
export function parseSlugPathnames(
  source: string,
  locales: readonly string[],
): Record<string, RouteTemplates> | null {
  const start = source.indexOf('pathnames:');
  if (start < 0) return null;
  // Commentaires de ligne entière seulement : une URL entre guillemets n'en est pas un.
  const body = source.slice(start).replace(/^\s*\/\/.*$/gm, '');
  const out: Record<string, RouteTemplates> = {};
  const re = /'(\/[^']*\[slug\][^']*)'\s*:\s*(?:'([^']*)'|\{([^}]*)\})/g;
  for (const m of body.matchAll(re)) {
    const key = m[1]!;
    if (m[2] !== undefined) {
      out[key] = Object.fromEntries(locales.map((l) => [l, m[2]!]));
    } else {
      const t: RouteTemplates = {};
      for (const lm of m[3]!.matchAll(/([a-z]{2})\s*:\s*'([^']*)'/g)) t[lm[1]!] = lm[2]!;
      out[key] = t;
    }
  }
  return out;
}

/** Gabarits par type, depuis les pathnames lus. */
export function routesByType(pathnames: Record<string, RouteTemplates>): Partial<Record<PageType, RouteTemplates>> {
  const out: Partial<Record<PageType, RouteTemplates>> = {};
  for (const type of PAGE_TYPE_NAMES) {
    const t = pathnames[PAGE_TYPES[type].route];
    if (t) out[type] = t;
  }
  return out;
}
