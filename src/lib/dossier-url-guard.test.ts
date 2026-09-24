// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde de régression pour toute la CLASSE de bug trouvée pendant le pilote
 * URL néerlandaise du dossier CPAS (PR #593) : dix points du code
 * construisaient l'URL d'un dossier à partir du slug CANONIQUE brut
 * (`card.slug`, `card.permalink`) au lieu du slug localisé
 * (`getLocalizedSlug()`, src/lib/content.ts). Aucun ne cassait de lien (la
 * redirection 301/308 de src/lib/redirects-301.ts absorbe le saut), mais
 * l'URL affichée restait l'ancienne pour un dossier à `localizedSlugs`
 * distinct (ex. cpas-bruxellois → brusselse-ocmws en NL). Les dix ont été
 * trouvés en curlant le HTML rendu après build, PAS en relisant le code :
 * ce garde existe pour que la classe entière soit détectée statiquement,
 * sans devoir refaire cette vérification manuelle à chaque nouveau point
 * d'entrée qui lie vers un dossier.
 *
 * Analyse statique pure, texte seulement (regex, pas d'AST), sur `src/` :
 * repère deux formes récurrentes dans ce dépôt pour construire une URL de
 * dossier —
 *
 *   A. gabarit `/dossiers/${EXPR}` dans un template literal. Exclut
 *      `content/dossiers/${slug}.${locale}.mdx` : c'est un CHEMIN DE
 *      FICHIER (src/lib/a-relire.ts), pas une URL — les .mdx sont nommés
 *      par slug CANONIQUE, jamais par slug localisé, à raison.
 *   B. route typée `pathname: '/dossiers/[slug]', params: { slug: EXPR }`
 *      (Next typed routes, `@/i18n/navigation`).
 *
 * Un littéral de chaîne (`params: { slug: 'vice-gouverneur' }`) n'est PAS
 * une violation : il est visible tel quel à la lecture du diff, contrairement
 * à une variable qui masque silencieusement d'où vient le slug — c'est
 * justement ce que ce garde vérifie. Seule une EXPRESSION (identifiant, accès
 * de propriété, appel) est classée.
 *
 * Une EXPR est sûre si son texte contient littéralement `getLocalizedSlug(`,
 * ou si elle figure dans ALLOWLIST ci-dessous avec sa raison (variable déjà
 * résolue via getLocalizedSlug plus haut dans le même fichier, paramètre de
 * route déjà localisé par son propre generateStaticParams, etc.).
 *
 * Hors du champ de ce garde : src/lib/radar.ts (`localize()` /
 * `localizeDossierRouteSlug`) construit son lien via un pathname choisi
 * dynamiquement dans une table (`PROMOTED_SECTION_PATHNAME`,
 * src/app/[locale]/radar/radar-content.tsx), pas le littéral
 * `/dossiers/[slug]` que ce scanner reconnaît structurellement. Couvert
 * séparément par src/lib/radar-dossier-route-slug.test.ts.
 *
 * Autre angle mort assumé : un littéral de chaîne exclu ci-dessus (donc pas
 * une violation) PEUT être le bug lui-même — c'était le cas originel de
 * explainers/brussels-paradox/page.tsx (`params: { slug: 'cpas-bruxellois' }`
 * en dur). Ce site est corrigé en résolvant `goFurther` dynamiquement
 * (getLocalizedSlug) avant le rendu, mais le TEXTE du littéral reste présent
 * dans `GO_FURTHER` comme repli inerte : ce scanner ne peut pas distinguer
 * « littéral toujours utilisé » de « littéral mort, écrasé au rendu ». Un
 * test dédié, ci-dessous, vérifie directement que le rendu utilise bien
 * `goFurther` (résolu) et pas `GO_FURTHER` (littéral) — la seule garantie
 * fiable pour cette forme de régression.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const EXTENSIONS = ['.tsx', '.ts'];

interface AllowEntry {
  /** Chemin relatif à la racine du dépôt, ex. 'src/app/sitemap.ts'. */
  file: string;
  /** Texte de l'expression, espaces normalisés (voir `normalize`). */
  expr: string;
  reason: string;
}

const ALLOWLIST: AllowEntry[] = [
  {
    file: 'src/app/[locale]/dossiers/[slug]/page.tsx',
    expr: 'slug',
    reason:
      "slug est le paramètre de route lui-même (JSON-LD `url`) : generateStaticParams l'émet déjà via getLocalizedSlug, donc déjà localisé.",
  },
  {
    file: 'src/app/[locale]/dossiers/[slug]/scrolly/page.tsx',
    expr: 'slug',
    reason:
      'même raison : slug est le paramètre de la route /scrolly, déjà localisé par son propre generateStaticParams (native uniquement, sans repli FR).',
  },
  {
    file: 'src/components/dossier/scrolly/scrolly-header.tsx',
    expr: 'slug',
    reason:
      "prop passée par la page /scrolly, qui la tient déjà de ses propres params de route (voir l'entrée précédente).",
  },
  {
    file: 'src/components/chat-widget.tsx',
    expr: 'routeSlug',
    reason:
      'vient de /api/chat/dossier-titles (DossierTitleEntry.routeSlug), calculé côté serveur via getLocalizedSlug (route.ts) ; le marqueur `[Dossier: slug]` lui-même reste le slug canonique, contrat inchangé.',
  },
  {
    file: 'src/lib/content.ts',
    expr: 'effectiveSlug',
    reason:
      "texte d'un message d'erreur de diagnostic (validateLocalizedSlugs), pas un lien navigable ; effectiveSlug est calculé juste au-dessus via `localizedSlugs?.[locale] ?? slug`.",
  },
  {
    file: 'src/lib/press-facts.ts',
    expr: 'fact.routeSlug',
    reason: 'routeSlug est déjà résolu via getLocalizedSlug dans resolvePressFact(), plus haut dans ce fichier.',
  },
  {
    file: 'src/components/presse/presse-view.tsx',
    expr: 'f.routeSlug',
    reason:
      'PressFactView.routeSlug (src/lib/press-facts.ts) est déjà résolu via getLocalizedSlug dans resolvePressFact() ; ce composant ne fait que le relayer dans le lien.',
  },
  {
    file: 'src/lib/slug-redirects.ts',
    expr: 'slug',
    reason: 'slug vient de effectiveSlug(), enveloppe locale de getLocalizedSlug définie plus haut dans ce fichier.',
  },
  {
    file: 'src/lib/controle-build.ts',
    expr: 'fr.localizedSlugs?.[locale] ?? slug',
    reason:
      "équivalent en ligne de getLocalizedSlug ; ce module lit le JSON Velite brut sans dépendre de @/lib/content par conception (contrôle après build, doit rester joignable avant que `.velite/` existe).",
  },
  {
    file: 'src/lib/controle-build.ts',
    expr: 'carte.localizedSlugs?.[locale] ?? slug',
    reason: "même raison que l'entrée précédente, branche vue immersive (/scrolly).",
  },
  {
    file: 'src/app/sitemap.ts',
    expr: 'slugForLocale',
    reason: 'slugForLocale est assigné via getLocalizedSlug(card, l) juste au-dessus (deux usages : <loc> et alternates).',
  },
  {
    file: 'src/app/[locale]/data/page.tsx',
    expr: 'dossier.slug',
    reason:
      "malgré son nom, DossierSection.slug est assigné via getLocalizedSlug(card, locale) à la construction de dossierSection, plus haut dans ce fichier — ce n'est pas le slug canonique brut. Angle mort du scanner texte (la ligne de consommation ne change pas si l'assignation régresse) : couvert par un test ciblé séparé, ci-dessous.",
  },
];

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listSourceFiles(p);
    if (!EXTENSIONS.includes(path.extname(e.name))) return [];
    if (/\.(test|spec)\.[jt]sx?$/.test(e.name)) return [];
    return [p];
  });
}

const rel = (p: string) => path.relative(ROOT, p).split(path.sep).join('/');

function normalize(expr: string): string {
  return expr.replace(/\s+/g, ' ').trim();
}

function isStringLiteral(expr: string): boolean {
  const t = expr.trim();
  return (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith('`') && t.endsWith('`') && !t.includes('${'))
  );
}

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

interface Match {
  file: string;
  expr: string;
  line: number;
}

/** Gabarit A : `/dossiers/${EXPR}`, hors chemin de fichier `content/dossiers/...`. */
const TEMPLATE_RE = /dossiers\/\$\{([^}]+)\}/g;
/** Gabarit B : route typée `pathname: '/dossiers/[slug]', … params: { slug: EXPR }`. */
const TYPED_ROUTE_RE = /pathname:\s*['"]\/dossiers\/\[slug\]['"][\s\S]{0,300}?params:\s*\{\s*slug:\s*([^,}]+)/g;

function findMatches(file: string, source: string): Match[] {
  const relFile = rel(file);
  const out: Match[] = [];

  for (const m of source.matchAll(TEMPLATE_RE)) {
    const before = source.slice(Math.max(0, m.index! - 20), m.index!);
    if (before.includes('content/')) continue; // chemin de fichier .mdx, pas une URL
    const expr = normalize(m[1]!);
    if (isStringLiteral(expr)) continue;
    out.push({ file: relFile, expr, line: lineAt(source, m.index!) });
  }

  for (const m of source.matchAll(TYPED_ROUTE_RE)) {
    const expr = normalize(m[1]!);
    if (isStringLiteral(expr)) continue;
    out.push({ file: relFile, expr, line: lineAt(source, m.index!) });
  }

  return out;
}

const files = listSourceFiles(SRC);
const sourceOf = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const allMatches = files.flatMap((f) => findMatches(f, sourceOf.get(f)!));

function isSafe(m: Match): boolean {
  if (m.expr.includes('getLocalizedSlug(')) return true;
  return ALLOWLIST.some((a) => a.file === m.file && a.expr === m.expr);
}

describe("garde : l'URL d'un dossier suit son slug localisé, pas le slug canonique brut", () => {
  it("l'analyse trouve bien des constructions d'URL de dossier, et exclut les chemins de fichier .mdx (témoin)", () => {
    // Sans témoin, une analyse cassée (0 occurrence, regex qui ne matche plus
    // rien après un refactor) passerait en silence, comme un garde absent.
    expect(allMatches.length).toBeGreaterThan(10);
    expect(allMatches.some((m) => m.file === 'src/lib/a-relire.ts')).toBe(false);
  });

  it('chaque construction à partir d’une expression passe par getLocalizedSlug, ou figure dans ALLOWLIST avec sa raison', () => {
    const violations = allMatches.filter((m) => !isSafe(m));
    const detail = violations.map((v) => `  ${v.file}:${v.line} — expr="${v.expr}"`).join('\n');
    expect(
      violations,
      `Slug de dossier construit sans getLocalizedSlug (à corriger, ou à ajouter à ALLOWLIST avec une raison) :\n${detail}`,
    ).toEqual([]);
  });

  it('chaque entrée de ALLOWLIST correspond encore à une occurrence réelle (pas une entrée morte)', () => {
    for (const a of ALLOWLIST) {
      const found = allMatches.some((m) => m.file === a.file && m.expr === a.expr);
      expect(found, `Entrée ALLOWLIST obsolète, plus trouvée dans le code : ${a.file} — "${a.expr}"`).toBe(true);
    }
  });

  it("le lien « CPAS » de explainers/brussels-paradox rend goFurther (résolu par locale), pas GO_FURTHER (littéral 'cpas-bruxellois') directement", () => {
    // Angle mort du scanner texte : voir le commentaire d'en-tête. Preuve
    // directe que le JSX consomme la liste RÉSOLUE, pas le tableau statique.
    const file = path.join(SRC, 'app', '[locale]', 'explainers', 'brussels-paradox', 'page.tsx');
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/\{goFurther\.map\(/);
    expect(src).not.toMatch(/\{GO_FURTHER\.map\(/);
  });

  it("DossierSection.slug (src/app/[locale]/data/page.tsx), consommé une ligne plus loin sous le nom `dossier.slug`, est bien assigné via getLocalizedSlug", () => {
    // Angle mort du scanner texte, documenté dans ALLOWLIST : la ligne de
    // consommation (`params: { slug: dossier.slug }`) ne change pas si cette
    // assignation régresse vers le slug canonique brut. Preuve directe ici.
    const file = path.join(SRC, 'app', '[locale]', 'data', 'page.tsx');
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/dossierSection:\s*DossierSection\s*=\s*\{[\s\S]{0,200}?slug:\s*getLocalizedSlug\(/);
  });
});
