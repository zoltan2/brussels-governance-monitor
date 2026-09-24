// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde « slug localisé modifié sans redirection ».
 *
 * velite.config.ts (champ `localizedSlugs` des dossiers) et
 * src/lib/redirects-301.ts posent une règle MANDATORY : un changement qui
 * modifie l'URL effective d'un dossier doit livrer, dans le même commit, une
 * redirection permanente de l'ancienne URL vers la nouvelle. Sinon les liens
 * externes (presse, partages, favoris) tombent en 404 sans aucun signal. Rien
 * ne le vérifiait : ce module compare les URL servies AVANT et APRÈS et exige,
 * pour chaque URL perdue, l'entrée de table correspondante.
 *
 * Fonctions pures : le script scripts/content-lint/slug-redirects.ts lit git
 * et le disque, puis appelle `checkSlugRedirects`.
 *
 * Modèle des URL servies, recopié des routes (dynamicParams = false) :
 * - page : src/app/[locale]/dossiers/[slug]/page.tsx émet, pour chaque carte
 *   FR, `/{L}/dossiers/{carteFR.localizedSlugs[L] ?? slug}` dans les quatre
 *   langues, puis ne rend la page que si `findDossierByLocalizedSlug` (content.ts)
 *   la retrouve. Une URL émise mais introuvable répond 404 : elle n'est pas
 *   servie.
 * - vue immersive : .../[slug]/scrolly/page.tsx émet, pour chaque dossier de
 *   SCROLLY_ENABLED_DOSSIERS et chaque langue où la carte existe nativement,
 *   `/{L}/dossiers/{carte.localizedSlugs[L] ?? slug}/scrolly`.
 * `draft` n'est pas filtré : generateStaticParams ne le filtre pas non plus.
 */

export interface DossierSlugInfo {
  /** Chemin du fichier, ex. content/dossiers/cpas-bruxellois.fr.mdx */
  file: string;
  locale: string;
  slug: string;
  localizedSlugs?: Partial<Record<string, string>>;
}

export interface Redirect {
  from: string;
  to: string;
}

export interface RetiredUrl {
  path: string;
  raison: string;
}

export interface SlugSnapshot {
  dossiers: DossierSlugInfo[];
  scrollyAllowlist: ReadonlySet<string>;
}

export interface SlugRedirectInput {
  locales: readonly string[];
  before: SlugSnapshot;
  after: SlugSnapshot;
  /** Renommages de fichiers FR détectés par git : ancien chemin → nouveau. */
  renames?: ReadonlyMap<string, string>;
  /** Table de redirections telle qu'elle sera déployée (arbre de travail). */
  redirects: readonly Redirect[];
  /** URL retirées volontairement, sans redirection (décision explicite). */
  retired: readonly RetiredUrl[];
}

export type ViolationKind =
  | 'missing-redirect'
  | 'wrong-target'
  | 'deleted-without-decision'
  | 'unrenderable-page'
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

interface ServedUrl {
  url: string;
  /** Identité stable : fichier FR, langue, type de page. */
  key: string;
  frFile: string;
  locale: string;
  kind: Kind;
}

const effectiveSlug = (card: DossierSlugInfo, locale: string): string =>
  card.localizedSlugs?.[locale] ?? card.slug;

const keyOf = (frFile: string, locale: string, kind: Kind) => `${frFile}\u0000${locale}\u0000${kind}`;

/** Miroir de findDossierByLocalizedSlug (src/lib/content.ts). */
function renders(dossiers: DossierSlugInfo[], slugFromUrl: string, locale: string): boolean {
  return (
    dossiers.some((c) => c.locale === locale && effectiveSlug(c, locale) === slugFromUrl) ||
    dossiers.some((c) => c.locale === 'fr' && effectiveSlug(c, 'fr') === slugFromUrl)
  );
}

export interface ServedResult {
  served: ServedUrl[];
  /** URL émises par generateStaticParams mais que la page ne sait pas rendre. */
  unrenderable: ServedUrl[];
}

/** URL de dossier réellement servies pour un état du contenu. */
export function servedDossierUrls(snapshot: SlugSnapshot, locales: readonly string[]): ServedResult {
  const { dossiers, scrollyAllowlist } = snapshot;
  const served: ServedUrl[] = [];
  const unrenderable: ServedUrl[] = [];
  const seenSlugs = new Set<string>();

  for (const fr of dossiers) {
    if (fr.locale !== 'fr' || seenSlugs.has(fr.slug)) continue;
    // getDossierCard(slug, 'fr') prend la première carte FR de ce slug.
    seenSlugs.add(fr.slug);
    for (const locale of locales) {
      const slug = effectiveSlug(fr, locale);
      const entry: ServedUrl = {
        url: `/${locale}/dossiers/${slug}`,
        key: keyOf(fr.file, locale, 'page'),
        frFile: fr.file,
        locale,
        kind: 'page',
      };
      (renders(dossiers, slug, locale) ? served : unrenderable).push(entry);
    }
    if (scrollyAllowlist.has(fr.slug)) {
      for (const locale of locales) {
        const native = dossiers.find((c) => c.slug === fr.slug && c.locale === locale);
        if (!native) continue;
        served.push({
          url: `/${locale}/dossiers/${effectiveSlug(native, locale)}/scrolly`,
          key: keyOf(fr.file, locale, 'scrolly'),
          frFile: fr.file,
          locale,
          kind: 'scrolly',
        });
      }
    }
  }
  return { served, unrenderable };
}

const PATH_RE = /^\/([a-z]{2})\/[^\s?#]*[^/\s?#]$/;

function localeOf(p: string): string | null {
  const m = PATH_RE.exec(p);
  return m ? m[1]! : null;
}

const fmt = (r: Redirect) => `{ from: '${r.from}', to: '${r.to}' },`;

/**
 * Contrôle complet. Rend la liste des violations ; vide = conforme.
 */
export function checkSlugRedirects(input: SlugRedirectInput): Violation[] {
  const { locales, redirects, retired } = input;
  const renames = input.renames ?? new Map<string, string>();
  const violations: Violation[] = [];

  const before = servedDossierUrls(input.before, locales).served;
  const afterResult = servedDossierUrls(input.after, locales);
  const after = afterResult.served;
  const afterUrls = new Set(after.map((s) => s.url));
  const afterByKey = new Map(after.map((s) => [s.key, s]));

  for (const u of afterResult.unrenderable) {
    violations.push({
      kind: 'unrenderable-page',
      message:
        `${u.url} est annoncée par la carte FR (${u.frFile}) mais la page répond 404 : ` +
        `la carte ${u.locale.toUpperCase()} doit déclarer le même localizedSlugs.${u.locale}, ` +
        `et une carte sans traduction ${u.locale.toUpperCase()} ne peut pas porter de slug localisé dans cette langue.`,
    });
  }

  // ── 1. Table elle-même ────────────────────────────────────────────────
  const byFrom = new Map<string, Redirect>();
  for (const r of redirects) {
    const lf = localeOf(r.from);
    const lt = localeOf(r.to);
    if (!lf || !lt || !locales.includes(lf) || !locales.includes(lt)) {
      violations.push({
        kind: 'invalid-path',
        message: `Entrée ${fmt(r)} : chaque côté doit être un chemin absolu préfixé par une langue (/${locales.join('|/')}/…), sans barre finale, requête ni ancre.`,
      });
      continue;
    }
    if (lf !== lt) {
      violations.push({
        kind: 'locale-mismatch',
        message: `Entrée ${fmt(r)} : la langue change (${lf} → ${lt}). Une redirection de slug reste dans sa langue.`,
      });
    }
    if (r.from === r.to) {
      violations.push({ kind: 'self-redirect', message: `Entrée ${fmt(r)} : redirige vers elle-même.` });
    }
    if (byFrom.has(r.from)) {
      violations.push({
        kind: 'duplicate-from',
        message: `Deux entrées partent de ${r.from} : garder une seule entrée par ancienne URL.`,
      });
      continue;
    }
    byFrom.set(r.from, r);
  }

  const reportedCycles = new Set<string>();
  for (const r of byFrom.values()) {
    if (r.from === r.to) continue;
    const next = byFrom.get(r.to);
    if (!next) continue;
    // Suivre la chaîne pour distinguer boucle et chaîne.
    const seen = [r.from];
    let cur: string = r.to;
    let loop = false;
    while (byFrom.has(cur)) {
      if (seen.includes(cur)) {
        loop = true;
        break;
      }
      seen.push(cur);
      cur = byFrom.get(cur)!.to;
    }
    if (loop) {
      const cycle = [...seen].sort().join(' → ');
      if (reportedCycles.has(cycle)) continue;
      reportedCycles.add(cycle);
      violations.push({
        kind: 'loop',
        message: `Boucle de redirections : ${seen.join(' → ')} → ${cur}. Le navigateur abandonnerait.`,
      });
    } else {
      const fix = { from: r.from, to: cur };
      violations.push({
        kind: 'chain',
        message:
          `Chaîne de redirections : ${seen.join(' → ')} → ${cur}. ` +
          `Une redirection doit mener directement à la page finale : remplacer l'entrée de ${r.from} par ${fmt(fix)}`,
        fix,
      });
    }
  }

  for (const r of byFrom.values()) {
    if (afterUrls.has(r.from)) {
      violations.push({
        kind: 'shadows-live-page',
        message: `Entrée ${fmt(r)} : ${r.from} est une page servie. next.config applique les redirections avant les routes, elle deviendrait inaccessible.`,
      });
    }
    if (byFrom.has(r.to)) continue; // déjà signalé comme chaîne ou boucle
    const lt = localeOf(r.to);
    if (lt && !afterUrls.has(r.to) && r.to !== `/${lt}/dossiers`) {
      violations.push({
        kind: 'target-missing',
        message:
          `Entrée ${fmt(r)} : la cible ${r.to} n'est pas une page de dossier servie. ` +
          `Ce contrôle ne vérifie que les dossiers (/${lt}/dossiers/…) et leur index /${lt}/dossiers.`,
      });
    }
  }

  const retiredPaths = new Set<string>();
  for (const r of retired) {
    if (!localeOf(r.path) || !r.raison?.trim()) {
      violations.push({
        kind: 'invalid-retired',
        message: `URL retirée « ${r.path} » : chemin préfixé par une langue et raison non vide obligatoires.`,
      });
      continue;
    }
    if (afterUrls.has(r.path)) {
      violations.push({ kind: 'invalid-retired', message: `URL retirée ${r.path} : elle est encore servie.` });
    }
    if (byFrom.has(r.path)) {
      violations.push({
        kind: 'invalid-retired',
        message: `URL ${r.path} à la fois retirée et redirigée : choisir l'un des deux.`,
      });
    }
    retiredPaths.add(r.path);
  }

  // ── 2. URL perdues entre la base et la branche ───────────────────────
  for (const old of before) {
    if (afterUrls.has(old.url)) continue;

    const frFile = renames.get(old.frFile) ?? old.frFile;
    const successor =
      afterByKey.get(keyOf(frFile, old.locale, old.kind)) ??
      // Vue immersive retirée : la page du dossier est la suite naturelle.
      (old.kind === 'scrolly' ? afterByKey.get(keyOf(frFile, old.locale, 'page')) : undefined);

    const existing = byFrom.get(old.url);

    if (successor) {
      const fix = { from: old.url, to: successor.url };
      if (!existing) {
        violations.push({
          kind: 'missing-redirect',
          message: `${old.url} n'est plus servie (nouvelle URL : ${successor.url}). Ajouter dans SLUG_REDIRECTS_301 (src/lib/redirects-301.ts) : ${fmt(fix)}`,
          fix,
        });
      } else if (existing.to !== successor.url) {
        violations.push({
          kind: 'wrong-target',
          message: `${old.url} redirige vers ${existing.to}, mais la page est désormais ${successor.url}. Remplacer l'entrée par : ${fmt(fix)}`,
          fix,
        });
      }
      continue;
    }

    // Dossier supprimé (ou carte FR disparue) : aucune suite évidente.
    if (existing || retiredPaths.has(old.url)) continue;
    violations.push({
      kind: 'deleted-without-decision',
      message:
        `${old.url} n'est plus servie et son dossier (${old.frFile}) a disparu. Décision explicite requise : ` +
        `soit une redirection dans SLUG_REDIRECTS_301, ex. { from: '${old.url}', to: '/${old.locale}/dossiers' }, ` +
        `soit une entrée { path: '${old.url}', raison: '…' } dans DOSSIER_URLS_RETIREES (src/lib/redirects-301.ts).`,
    });
  }

  return violations;
}

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
