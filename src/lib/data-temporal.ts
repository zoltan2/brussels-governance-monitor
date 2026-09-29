// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Phrases temporelles relatives dans data/radar.json et data/changelog.json.
 *
 * `check_temporal` (scripts/content-lint/lib.sh) ne lit que les MDX, alors que
 * l'accueil affiche le radar (`summary`, repli sur `descriptions`) et le
 * changelog. Le 28/09/2026, les mêmes motifs trouvaient 8 occurrences dans ces
 * deux fichiers (revue orange), dont « dans les semaines à venir » sur un
 * signal de mars et « in the coming days » sur un signal de mai : un texte qui
 * vieillit en vitrine sans que rien ne le signale.
 *
 * Mêmes motifs que les MDX (scripts/content-lint/temporal-patterns.txt, une
 * source unique), mêmes règles : sensibles à la casse, comme `grep -E`. Le
 * texte entre « » est exclu : une citation reste telle qu'elle a été dite.
 *
 * Ne bloque que ce qu'une PR ajoute ou réécrit : un signal par son `id`, une
 * entrée du changelog par (date, section, targetSlug). Le changelog a des
 * couples en double le même jour (faits distincts) : un texte est « nouveau »
 * s'il n'existe dans AUCUNE entrée de même clé à la base.
 *
 * Module pur, sans accès disque.
 */

export const LOCALES = ['fr', 'nl', 'en', 'de'] as const;

/** Motifs de temporal-patterns.txt (commentaires et lignes vides retirés). */
export function parseTemporalPatterns(fileText: string): RegExp[] {
  return fileText
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => new RegExp(l));
}

/** Retire les citations « … » (guillemets français, espaces insécables compris). */
export function stripQuotations(text: string): string {
  return text.replace(/«[^»]*»/g, '« »');
}

/** Motifs trouvés dans le texte hors citations, sous forme du passage trouvé. */
export function temporalHits(text: string, patterns: readonly RegExp[], opts: { keepQuotations?: boolean } = {}): string[] {
  const t = opts.keepQuotations ? text : stripQuotations(text);
  const hits: string[] = [];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) hits.push(m[0]);
  }
  return hits;
}

export interface DataText {
  /** Identifiant lisible : id du signal, ou date/section/slug du changelog. */
  where: string;
  /** Champ et langue, ex. `summary.fr`. */
  field: string;
  text: string;
}

type I18n = Partial<Record<(typeof LOCALES)[number], unknown>> | undefined;

function i18nTexts(where: string, name: string, value: I18n): DataText[] {
  if (!value || typeof value !== 'object') return [];
  const out: DataText[] = [];
  for (const l of LOCALES) {
    const text = value[l];
    if (typeof text === 'string' && text.trim()) out.push({ where, field: `${name}.${l}`, text });
  }
  return out;
}

export interface RadarLike {
  id: string;
  summary?: I18n;
  descriptions?: I18n;
  nextStep?: I18n;
}

export interface ChangelogLike {
  date: string;
  section: string;
  targetSlug: string | null;
  descriptions?: I18n;
  summaries?: I18n;
}

const RADAR_FIELDS = ['summary', 'descriptions', 'nextStep'] as const;
const CHANGELOG_FIELDS = ['descriptions', 'summaries'] as const;

function radarTexts(e: RadarLike): DataText[] {
  return RADAR_FIELDS.flatMap((f) => i18nTexts(e.id, f, e[f]));
}

const changelogKey = (e: ChangelogLike) => `${e.date} ${e.section}/${e.targetSlug ?? '-'}`;

function changelogTexts(e: ChangelogLike): DataText[] {
  return CHANGELOG_FIELDS.flatMap((f) => i18nTexts(changelogKey(e), f, e[f]));
}

/** Textes du radar ajoutés ou réécrits par rapport à la base (null = tout est nouveau). */
export function changedRadarTexts(base: readonly RadarLike[] | null, head: readonly RadarLike[]): DataText[] {
  const before = new Map<string, Set<string>>();
  for (const e of base ?? []) before.set(e.id, new Set(radarTexts(e).map((t) => `${t.field}\u0000${t.text}`)));
  return head.flatMap((e) => {
    const old = before.get(e.id);
    return radarTexts(e).filter((t) => !old?.has(`${t.field}\u0000${t.text}`));
  });
}

/** Textes du changelog ajoutés ou réécrits par rapport à la base (null = tout est nouveau). */
export function changedChangelogTexts(base: readonly ChangelogLike[] | null, head: readonly ChangelogLike[]): DataText[] {
  const before = new Set<string>();
  for (const e of base ?? []) for (const t of changelogTexts(e)) before.add(`${t.where}\u0000${t.field}\u0000${t.text}`);
  return head.flatMap((e) => changelogTexts(e).filter((t) => !before.has(`${t.where}\u0000${t.field}\u0000${t.text}`)));
}

export interface TemporalFinding extends DataText {
  hits: string[];
}

export function findTemporal(texts: readonly DataText[], patterns: readonly RegExp[]): TemporalFinding[] {
  return texts.map((t) => ({ ...t, hits: temporalHits(t.text, patterns) })).filter((f) => f.hits.length > 0);
}
