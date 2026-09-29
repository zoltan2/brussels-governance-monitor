// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Contrôle éditorial des digests hebdomadaires générés par Haiku
 * (content/digest/AAAA-wNN.<langue>.mdx, onze langues).
 *
 * Le générateur (bgm-ops, src/digest.ts) écrit le corps à partir des entrées
 * de la semaine de data/changelog.json et des signaux actifs de
 * data/radar.json. Il poussait sur main sans relecture ; depuis bgm-ops #30 il
 * ouvre une PR. Défauts réels publiés avant que ce contrôle existe :
 *
 * - w38 (20/09/2026) : fichier turc coupé au milieu d'un lien (14 lignes au
 *   lieu de 60, une section sur neuf) ; paragraphe « Foyer anderlechtois »
 *   consacré à Kanal avec un lien vers le dossier du Foyer ; « Région
 *   francophone » inventée, et Communauté française comptée à côté de la
 *   Fédération Wallonie-Bruxelles, qui est la même entité.
 * - w39 (27/09/2026) : treize erreurs corrigées par #613, dont une date
 *   fausse (« le 27 septembre » pour une décision du 24 : le générateur a pris
 *   la date de l'entrée du changelog pour celle de l'événement), des
 *   interprétations non sourcées et un titre de section sans rapport.
 *
 * Quatre règles, toutes pures (aucun accès disque ici) :
 * 1. complétude entre langues d'une même semaine ;
 * 2. cohérence entre un lien vers une fiche et la semaine ou le texte qui le
 *    porte (l'existence de la page est vérifiée par findLinkProblems,
 *    src/lib/internal-links.ts, que le script appelle) ;
 * 3. entités belges inventées ;
 * 4. ancrage des dates et des nombres du corps français dans les sources que
 *    le générateur a reçues.
 */

export const DIGEST_LANGS = ['fr', 'nl', 'en', 'de', 'ar', 'es', 'pl', 'pt', 'ro', 'sw', 'tr'] as const;

export type DigestRule = 'completude' | 'liens' | 'coherence' | 'entites' | 'faits';

export interface DigestFinding {
  rule: DigestRule;
  level: 'error' | 'warning';
  /** Langue du fichier concerné. */
  lang: string;
  /** Ligne dans le corps (à partir de 1), quand elle a un sens. */
  line?: number;
  message: string;
}

/** Semaine et langue d'un chemin `…/2026-w39.fr.mdx`, ou null (fixtures, autres fichiers). */
export function parseDigestPath(file: string): { week: string; lang: string } | null {
  const m = /(?:^|\/)(\d{4}-w\d{2})\.([a-z]{2})\.mdx$/.exec(file);
  return m ? { week: m[1]!, lang: m[2]! } : null;
}

/**
 * Corps du digest, sans le frontmatter. Le frontmatter français porte aussi le
 * bloc `magazine`, écrit à la main après coup : il ne compte ni dans la taille
 * ni dans les faits contrôlés.
 */
export function digestBody(raw: string): string {
  const input = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/.exec(input);
  return (m ? m[1]! : input).replace(/\r\n/g, '\n');
}

/** Lundi et dimanche (AAAA-MM-JJ) d'une semaine ISO `2026-w39`. */
export function weekRange(week: string): { monday: string; sunday: string } {
  const m = /^(\d{4})-w(\d{2})$/.exec(week);
  if (!m) throw new Error(`semaine illisible : ${week}`);
  const year = Number(m[1]);
  const n = Number(m[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (n - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { monday: iso(monday), sunday: iso(sunday) };
}

/* -------------------------------------------------------------------------
 * Règle 1 : complétude entre langues
 * ---------------------------------------------------------------------- */

/**
 * Titres d'un niveau donné dans le corps : `## …` (niveau 2, par défaut) ou
 * `### …` (niveau 3). Le digest w36 range ses sujets en `###` sous un seul
 * `##` ; le swahili et le turc en avaient perdu cinq sur quinze.
 */
export function countSections(body: string, level: 2 | 3 = 2): number {
  const re = level === 2 ? /^##\s/ : /^###\s/;
  return body.split('\n').filter((l) => re.test(l)).length;
}

/** Taille du corps en caractères (points de code), espaces de bord retirés. */
export function bodySize(body: string): number {
  return [...body.trim()].length;
}

/**
 * Lien Markdown ouvert et jamais fermé : `[texte` sans `]`, ou `](` sans `)`,
 * sur la même ligne. C'est la signature d'une réponse coupée par la limite de
 * jetons (w38 turc : « … [Brüksel Şehri, **6 Ekim 2030** » en fin de fichier).
 * Renvoie la ligne (à partir de 1) du premier lien ouvert, ou null.
 */
export function findUnclosedLink(body: string): number | null {
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Code en ligne retiré : un crochet cité n'est pas un lien.
    const text = lines[i]!.replace(/`[^`]*`/g, '');
    let depth = 0;
    let open = false;
    for (let j = 0; j < text.length; j++) {
      const c = text[j];
      if (c === '[') {
        depth++;
        open = true;
      } else if (c === ']' && depth > 0) {
        depth--;
        if (text[j + 1] === '(') {
          const close = text.indexOf(')', j + 2);
          if (close === -1) return i + 1;
          j = close;
        }
        if (depth === 0) open = false;
      }
    }
    if (open && depth > 0) return i + 1;
  }
  return null;
}

/** Part minimale du corps français sous laquelle une traduction est tenue pour tronquée. */
export const MIN_SIZE_RATIO = 0.6;

/**
 * Compare chaque langue d'une semaine au français : même nombre de sections
 * « ## » et de sous-sections « ### », au moins 60 % de la taille du corps, aucun lien coupé. `requireAll` : la
 * semaine est nouvelle dans la PR, une langue absente est une erreur (sinon
 * un avertissement, pour ne pas bloquer une retouche d'archive incomplète).
 */
export function checkCompleteness(bodies: Record<string, string>, opts: { requireAll: boolean }): DigestFinding[] {
  const out: DigestFinding[] = [];
  const fr = bodies.fr;
  for (const [lang, body] of Object.entries(bodies)) {
    const line = findUnclosedLink(body);
    if (line !== null) {
      out.push({ rule: 'completude', level: 'error', lang, line, message: 'lien Markdown ouvert et jamais fermé : fichier probablement coupé' });
    }
  }
  if (fr === undefined) {
    out.push({ rule: 'completude', level: 'error', lang: 'fr', message: 'version française absente : aucune langue ne peut être comparée' });
    return out;
  }
  const frSections = countSections(fr);
  const frSub = countSections(fr, 3);
  const frSize = bodySize(fr);
  for (const lang of DIGEST_LANGS) {
    const body = bodies[lang];
    if (body === undefined) {
      out.push({ rule: 'completude', level: opts.requireAll ? 'error' : 'warning', lang, message: 'langue absente de la semaine' });
      continue;
    }
    if (lang === 'fr') continue;
    const sections = countSections(body);
    if (sections !== frSections) {
      out.push({ rule: 'completude', level: 'error', lang, message: `${sections} section(s) « ## » contre ${frSections} en français` });
    }
    const sub = countSections(body, 3);
    if (sub !== frSub) {
      out.push({ rule: 'completude', level: 'error', lang, message: `${sub} sous-section(s) « ### » contre ${frSub} en français` });
    }
    const size = bodySize(body);
    if (frSize > 0 && size < frSize * MIN_SIZE_RATIO) {
      const pct = Math.round((size / frSize) * 100);
      out.push({ rule: 'completude', level: 'error', lang, message: `corps de ${size} caractères, ${pct} % du français (${frSize}) ; minimum ${MIN_SIZE_RATIO * 100} %` });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------
 * Règle 2 : cohérence entre un lien vers une fiche et son paragraphe
 * ---------------------------------------------------------------------- */

/** Minuscules sans accents, pour comparer des mots. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Mots qui ne désignent pas un sujet : outils grammaticaux des quatre langues
 * du site, et noms trop généraux pour prouver qu'un paragraphe parle d'une
 * fiche (« Bruxelles » figure dans presque tous).
 */
const STOPWORDS = new Set(
  [
    // fr
    'dans', 'pour', 'avec', 'sans', 'sous', 'entre', 'vers', 'chez', 'plus', 'moins', 'leur', 'leurs', 'cette', 'sont', 'fait', 'mais',
    'bruxelles', 'bruxellois', 'bruxelloise', 'bruxelloises', 'region', 'regional', 'regionale', 'commune', 'communes', 'ville', 'dossier',
    'fiche', 'domaine', 'secteur', 'politique', 'gouvernance',
    // nl
    'voor', 'naar', 'door', 'over', 'zijn', 'haar', 'deze', 'brussel', 'brusselse', 'gewest', 'gemeente', 'stad', 'beleid',
    // en
    'with', 'from', 'into', 'over', 'this', 'that', 'their', 'brussels', 'city', 'municipality', 'policy', 'region',
    // de
    'fuer', 'mit', 'ohne', 'nach', 'uber', 'ueber', 'diese', 'brussel', 'bruessel', 'stadt', 'gemeinde', 'politik',
  ].map(fold),
);

/**
 * Mots significatifs d'un sujet de fiche : mots de 4 lettres ou plus hors mots
 * vides, et sigles en capitales de 2 lettres ou plus (ACS, ZRU, LEZ, PFAS).
 * Chaque mot est réduit à ses 6 premières lettres, pour qu'« anderlechtois »
 * rejoigne « Anderlecht » et « sécurité » « sécuritaire ».
 */
export function subjectStems(subject: string): string[] {
  const stems = new Set<string>();
  for (const raw of subject.split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue;
    const isAcronym = raw.length >= 2 && raw === raw.toUpperCase() && /\p{Lu}/u.test(raw);
    const w = fold(raw);
    if (!isAcronym && (w.length < 4 || STOPWORDS.has(w))) continue;
    if (/^\d+$/.test(w)) continue;
    stems.add(w.slice(0, 6));
  }
  return [...stems];
}

/**
 * Sujet d'une fiche tel qu'un paragraphe doit le nommer : `shortTitle` s'il
 * existe, sinon le titre avant son premier deux-points (« Métro 3 : projet
 * gelé… » → « Métro 3 »). La suite du titre change à chaque veille.
 */
export function cardSubject(title: string, shortTitle?: string): string {
  if (shortTitle && shortTitle.trim()) return shortTitle.trim();
  return title.split(/\s*[:：]\s+/)[0]!.trim();
}

export interface CardRef {
  /** Slug du fichier de la fiche (commun aux langues), comparé aux cibles de la semaine. */
  slug: string;
  /** Libellé lisible pour le message (« le dossier « Foyer anderlechtois » »). */
  label: string;
  /** Racines de mots dont l'une doit figurer dans le texte. */
  stems: string[];
}

const LINK_RE = /\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g;

/**
 * Lien d'appel à l'action (« [Voir le dossier X →](…) ») : son texte est
 * produit à partir de la cible, il ne prouve pas que le paragraphe parle du
 * sujet. Un lien intégré à la phrase (« du [métro 3](…) ») en fait partie.
 */
export function isCallToAction(linkText: string): boolean {
  return /[→»]\s*$/.test(linkText) || /^\s*(?:voir|consulter|lire|d[ée]couvrir|bekijk|raadpleeg|lees|ontdek|see|read|view|explore|consult|siehe|lesen|mehr|zum|zur|zu)\b/iu.test(linkText);
}

/**
 * Texte courant d'un paragraphe : liens d'appel à l'action retirés, liens
 * intégrés réduits à leur texte, étiquette en gras de tête retirée
 * (« **Foyer anderlechtois.** », « **Josaphat : 12 000 réactions** — »).
 */
export function runningText(paragraph: string): string {
  return paragraph
    .replace(/^\s*\*\*[^*]+\*\*\s*[—–:.-]?\s*/, ' ')
    .replace(LINK_RE, (_m, text: string) => (isCallToAction(text) ? ' ' : ` ${text} `))
    .replace(/[*_`]/g, '')
    .trim();
}

function mentions(text: string, stems: string[]): boolean {
  const tokens = fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return stems.some((stem) => tokens.some((t) => t.startsWith(stem)));
}

const wordCount = (s: string) => s.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;

/**
 * Un lien vers une fiche doit être justifié : soit la fiche est visée par
 * une source de la semaine (`weekSlugs` : `targetSlug` d'une entrée du
 * changelog, `cards` d'un signal du radar daté de la semaine), soit le texte
 * qui porte le lien nomme son sujet. Le générateur n'a aucune autre raison
 * légitime de lier une fiche.
 *
 * Ce qui compte comme « texte » :
 * - le lien est dans un paragraphe d'au moins cinq mots hors lien : ce
 *   paragraphe seul, sans son étiquette en gras de tête ni le texte d'un lien
 *   d'appel à l'action. Le titre de section ne compte PAS ;
 * - le lien est seul dans son paragraphe (« [Voir la fiche →](…) ») : toute
 *   la section, titre compris.
 *
 * Ce qui est attrapé : le défaut w38. Le Foyer anderlechtois n'avait aucune
 * entrée cette semaine-là (sa fiche datait du 09/09). Titre de section, étiquette
 * « **Foyer anderlechtois.** » et lien « Consulter le dossier Foyer
 * anderlechtois → » disaient Foyer anderlechtois ; les phrases du paragraphe,
 * elles, ne parlaient que de Kanal. Le lien était dans le paragraphe : ni le
 * titre, ni l'étiquette, ni le texte du lien ne sont comptés, le défaut sort.
 *
 * Ce qui ne l'est pas : un lien vers une fiche qui a une entrée dans la
 * semaine, même posé sur le mauvais paragraphe ; une section « ## Foyer
 * anderlechtois » dont le texte parle d'autre chose, terminée par un lien
 * seul vers le Foyer (le titre compte alors, sans quoi « ## Métro 3 » suivi
 * d'un texte sur le Palais du Midi échouait à tort) ; et un lien intégré à la
 * phrase dont le texte nomme lui-même le sujet.
 *
 * `resolve` associe un chemin de lien à sa fiche, ou null si le lien n'est
 * pas contrôlé (radar, listes, liens externes).
 */
export function checkLinkCoherence(
  body: string,
  lang: string,
  resolve: (link: string) => CardRef | null,
  weekSlugs: ReadonlySet<string> = new Set(),
): DigestFinding[] {
  const out: DigestFinding[] = [];
  type Para = { text: string; line: number };
  type Section = { heading: string; paras: Para[] };
  const sections: Section[] = [{ heading: '', paras: [] }];
  let cur: Para | null = null;
  body.split('\n').forEach((l, i) => {
    const h = /^(#{1,6})\s+(.*)$/.exec(l);
    if (h) {
      if (h[1] === '##') sections.push({ heading: h[2]!, paras: [] });
      cur = null;
      return;
    }
    if (!l.trim()) {
      cur = null;
      return;
    }
    if (!cur) {
      cur = { text: l, line: i + 1 };
      sections[sections.length - 1]!.paras.push(cur);
    } else cur.text += `\n${l}`;
  });

  for (const section of sections) {
    const sectionText = [section.heading, ...section.paras.map((p) => runningText(p.text))].join(' ');
    for (const p of section.paras) {
      for (const m of p.text.matchAll(LINK_RE)) {
        const card = resolve(m[2]!);
        if (!card || weekSlugs.has(card.slug)) continue;
        const own = runningText(p.text);
        const scope = wordCount(own) >= 5 ? own : sectionText;
        if (mentions(scope, card.stems)) continue;
        const lineOffset = p.text.slice(0, m.index).split('\n').length - 1;
        out.push({
          rule: 'coherence',
          level: 'error',
          lang,
          line: p.line + lineOffset,
          message:
            `lien vers ${card.label} (${m[2]}) : aucune entrée du changelog ni aucun signal de la semaine ne vise cette fiche, ` +
            `et le texte ne nomme pas son sujet (mots attendus : ${card.stems.join(', ') || 'aucun'})`,
        });
      }
    }
  }
  return out;
}

/* -------------------------------------------------------------------------
 * Règle 3 : entités belges inventées
 * ---------------------------------------------------------------------- */

/**
 * Entités qui n'existent pas. La Belgique a trois Régions (flamande, wallonne,
 * Bruxelles-Capitale) et trois Communautés (française, flamande,
 * germanophone) : une « Région francophone » ou « germanophone » est une
 * invention (w38). Les formes des quatre langues du site et des traductions
 * latines ; les langues non latines héritent du texte français, contrôlé.
 */
const INVENTED_ENTITIES: { re: RegExp; label: string }[] = [
  { re: /\br[ée]gions?\s+(?:francophones?|germanophones?|n[ée]erlandophones?)(?!\p{L})/iu, label: 'Région francophone / germanophone / néerlandophone' },
  { re: /\b(?:franstalige?|duitstalige?|nederlandstalige?)\s+gewest(?:en)?(?!\p{L})/iu, label: 'Franstalig / Duitstalig Gewest' },
  { re: /\b(?:francophone|french-speaking|german-speaking|dutch-speaking)\s+regions?(?!\p{L})/iu, label: 'francophone / German-speaking Region' },
  { re: /\b(?:französischsprachigen?|frankophonen?|deutschsprachigen?|niederländischsprachigen?)\s+Regionen?(?!\p{L})/iu, label: 'französischsprachige / deutschsprachige Region' },
  { re: /\b(?:regi[óo]n|regi[ãa]o)\s+(?:franc[óo]fona|german[óo]fona)(?!\p{L})/iu, label: 'Región / Região francófona' },
  // Formes relevées dans les traductions du 20/09/2026 (roumain, swahili).
  { re: /\bregiun(?:e|ea)\s+(?:francofon[ăa]|germanofon[ăa])(?!\p{L})/iu, label: 'Regiunea Francofonă' },
  { re: /\bKanda\s+ya\s+Kifaran\p{L}*/iu, label: 'Kanda ya Kifaransa' },
];

/** Communauté française et Fédération Wallonie-Bruxelles : la même entité, deux noms. */
const CF = String.raw`(?:Communaut[ée]\s+fran[çc]aise|Franse\s+Gemeenschap|French\s+Community|Französischen?\s+Gemeinschaft)`;
// « Föderalen Wallonien-Brüssel » : forme fautive réellement produite en allemand le 20/09/2026.
const FWB = String.raw`(?:F[ée]d[ée]ration\s+Wallonie-Bruxelles|Federatie\s+Walloni[ëe]-Brussel|Wallonia-Brussels\s+Federation|F[öo]der(?:ation|alen?)\s+Wallonien?-Br[üu]ssel)`;
const JOIN = String.raw`\s*(?:,|\bet\b|\bainsi\s+que\b|\ben\b|\bevenals\b|\band\b|\bas\s+well\s+as\b|\bund\b|\bsowie\b)\s*(?:(?:la|le|les|de|het|the|die|der)\s+)?`;
const DOUBLED_RE = new RegExp(`${CF}${JOIN}${FWB}|${FWB}${JOIN}${CF}`, 'iu');
const BOTH_CF = new RegExp(CF, 'iu');
const BOTH_FWB = new RegExp(FWB, 'iu');

function lineOf(body: string, index: number): number {
  return body.slice(0, index).split('\n').length;
}

/**
 * Erreur : entité inventée, ou les deux noms de la même Communauté
 * coordonnés (« la Communauté française et la Fédération Wallonie-Bruxelles »),
 * ce qui les présente comme deux entités.
 * Avertissement seulement : les deux noms dans une même phrase sans
 * coordination directe. Une apposition légitime existe (« la Fédération
 * Wallonie-Bruxelles, nom usuel de la Communauté française ») et l'heuristique
 * ne sait pas la distinguer d'un dédoublement.
 */
export function checkEntities(body: string, lang: string): DigestFinding[] {
  const out: DigestFinding[] = [];
  for (const { re, label } of INVENTED_ENTITIES) {
    const g = new RegExp(re.source, 'giu');
    for (const m of body.matchAll(g)) {
      out.push({ rule: 'entites', level: 'error', lang, line: lineOf(body, m.index!), message: `entité inexistante « ${m[0]} » (${label}) : la Belgique n'a que trois Régions, dont aucune linguistique` });
    }
  }
  const doubled = new RegExp(DOUBLED_RE.source, 'giu');
  const flagged = new Set<number>();
  for (const m of body.matchAll(doubled)) {
    const line = lineOf(body, m.index!);
    flagged.add(line);
    out.push({ rule: 'entites', level: 'error', lang, line, message: `« ${m[0].replace(/\s+/g, ' ')} » : Communauté française et Fédération Wallonie-Bruxelles sont une seule entité, pas deux` });
  }
  // Même phrase, sans coordination directe : avertissement.
  let offset = 0;
  for (const sentence of body.split(/(?<=[.!?])\s+/)) {
    const idx = body.indexOf(sentence, offset);
    offset = idx >= 0 ? idx + sentence.length : offset;
    if (BOTH_CF.test(sentence) && BOTH_FWB.test(sentence)) {
      const line = lineOf(body, Math.max(idx, 0));
      if (flagged.has(line)) continue;
      out.push({ rule: 'entites', level: 'warning', lang, line, message: 'Communauté française et Fédération Wallonie-Bruxelles dans la même phrase : vérifier qu’elles ne sont pas présentées comme deux entités' });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------
 * Règle 4 : ancrage des dates et des nombres (français)
 * ---------------------------------------------------------------------- */

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};
const MONTH_ALT = 'janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre';
const pad = (n: number) => String(n).padStart(2, '0');

export interface Facts {
  /** Dates complètes AAAA-MM-JJ. */
  dates: Set<string>;
  /** Jours sans année MM-JJ (toutes les dates, complètes ou non). */
  days: Set<string>;
  /** Nombres normalisés (sans séparateur de milliers, virgule décimale). */
  numbers: Set<string>;
}

export interface BodyFact {
  kind: 'date' | 'nombre';
  /** Tel qu'écrit. */
  text: string;
  /** Clé normalisée comparée aux sources. */
  key: string;
  line: number;
  /** Sous un titre qui contient « radar » (section des signaux actifs). */
  radar: boolean;
  /** Nombre annoncé comme arrondi (« plus de », « environ »…), voir `approximation`. */
  approx?: Approx;
}

export type Approx = 'plus de' | 'moins de' | 'environ';

/**
 * Qualificatif d'arrondi juste avant un nombre. Le générateur arrondit une
 * source (w33 : « 1 595 signatures » devenu « plus de 1 500 signatures ») :
 * c'est exact, et l'exiger au chiffre près ferait échouer un texte juste.
 */
function approximation(before: string): Approx | undefined {
  const tail = fold(before).replace(/\s+/g, ' ').slice(-24);
  if (/(?:plus d[e']|au moins|au-dela d[e'])\s*$/.test(tail)) return 'plus de';
  if (/(?:moins d[e']|pres d[e']|presque|jusqu'a)\s*$/.test(tail)) return 'moins de';
  if (/(?:environ|quelque|autour d[e']|de l'ordre d[e']|pres de)\s*$/.test(tail)) return 'environ';
  return undefined;
}

/** Valeur d'une clé de nombre (« 47,6 » → 47.6). */
const numericValue = (key: string) => Number(key.replace(',', '.'));

/** Espaces insécables et fines, gras Markdown, cibles de liens retirés. */
function normalizeText(s: string): string {
  return s
    .replace(/[\u00a0\u202f\u2007\u2009]/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/\*\*/g, '');
}

/** Clé d'un nombre écrit : « 12 000 » et « 12.000 » → « 12000 », « 47,6 » reste « 47,6 ». */
export function numberKey(raw: string): string {
  let s = raw.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
  if (/^\d+\.\d+$/.test(s)) s = s.replace('.', ',');
  return s;
}

const DATE_FULL = new RegExp(String.raw`\b(1er|\d{1,2})\s+(${MONTH_ALT})\s+(\d{4})\b`, 'giu');
const DATE_SLASH = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
const DATE_DAY = new RegExp(String.raw`\b(1er|\d{1,2})\s+(${MONTH_ALT})\b`, 'giu');
const DATE_DAY_SLASH = /\b(\d{1,2})\/(\d{1,2})\b(?!\/)/g;
/** Intitulé de la semaine du digest (« Semaine du 31 août au 6 septembre 2026 ») : ni une date ni un fait. */
const WEEK_SPAN = new RegExp(String.raw`\bsemaine\s+du\s+(?:1er|\d{1,2})(?:\s+(?:${MONTH_ALT}))?\s+au\s+(?:1er|\d{1,2})\s+(?:${MONTH_ALT})(?:\s+\d{4})?`, 'giu');
const MONTH_YEAR = new RegExp(String.raw`\b(${MONTH_ALT})\s+\d{4}\b`, 'giu');
/** Nombre avec séparateurs d'espace ou de point pour les milliers, décimale à virgule. */
const NUMBER = /(?<![\p{L}\d,.\/-])(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:[,.]\d+)?)(?:\s?(%))?(?![\p{L}\d]|-\p{L})/gu;

function monthOf(name: string): number {
  return MONTHS[fold(name)]!;
}

const WORD_VALUES: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12,
  treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50,
  soixante: 60, septante: 70, huitante: 80, octante: 80, nonante: 90,
};

/**
 * Nombres écrits en toutes lettres dans un texte (« deux mille », « quarante-deux
 * millions », « mille »). La charte du site écrit souvent les nombres en
 * lettres ; le générateur les reprend en chiffres (w36 : « de deux mille à
 * mille places » devenu « de 2 000 à 1 000 places »). Pour « quarante-deux
 * millions », renvoie 42 et 42 000 000 : le corps écrit « 42 millions ».
 */
export function frenchNumberWords(text: string): number[] {
  const out: number[] = [];
  // Mot, puis ce qui le sépare du suivant : une ponctuation coupe le nombre
  // (« quatre-vingt-dix-neuf, soixante et onze » donne deux nombres).
  const tokens = [...fold(text).matchAll(/([a-z]+)([^a-z]*)/g)].map((m) => ({ tok: m[1]!, cut: /[^\s-]/.test(m[2]!) }));
  let total = 0;
  let current = 0;
  let prev = '';
  let active = false;
  let meaningful = false;
  const flush = () => {
    if (active && meaningful) out.push(total + current);
    total = 0;
    current = 0;
    prev = '';
    active = false;
    meaningful = false;
  };
  for (const { tok, cut } of tokens) {
    step(tok);
    if (cut) flush();
  }
  flush();
  return out;

  function step(tok: string): void {
    if (tok in WORD_VALUES) {
      const v = WORD_VALUES[tok]!;
      // « quatre-vingt(s) » : 4 × 20 ; « soixante-dix » : 60 + 10 (pris tel quel).
      if (v === 20 && prev === 'quatre') current += 80 - 4;
      else current += v;
      active = true;
      if (tok !== 'un' && tok !== 'une') meaningful = true;
    } else if (tok === 'cent' || tok === 'cents') {
      current = (current || 1) * 100;
      active = meaningful = true;
    } else if (tok === 'mille') {
      total += (current || 1) * 1000;
      current = 0;
      active = meaningful = true;
    } else if (/^(?:million|milliard)s?$/.test(tok) && active) {
      const n = total + current;
      out.push(n);
      total = n * (tok.startsWith('milliard') ? 1e9 : 1e6);
      current = 0;
      meaningful = true;
    } else if (tok === 'et' && active) {
      return; // « vingt et un »
    } else {
      flush();
      return;
    }
    prev = tok;
  }
}

/** Retire une correspondance du texte en gardant les positions (lignes). */
function blank(text: string, re: RegExp, onMatch?: (m: RegExpMatchArray) => void): string {
  return text.replace(re, (...args) => {
    const m = args as unknown as RegExpMatchArray;
    onMatch?.(m);
    return ' '.repeat((m[0] as string).length);
  });
}

/**
 * Dates et nombres d'un texte source (descriptions du changelog et du radar).
 * Toutes les formes sont retenues, y compris les nombres d'un chiffre : une
 * source ne peut que rendre un fait du corps acceptable.
 */
export function extractSourceFacts(texts: string[]): Facts {
  const facts: Facts = { dates: new Set(), days: new Set(), numbers: new Set() };
  for (const raw of texts) {
    let t = normalizeText(raw);
    t = blank(t, DATE_FULL, (m) => {
      const d = m[1] === '1er' ? 1 : Number(m[1]);
      const mo = monthOf(m[2]!);
      facts.dates.add(`${m[3]}-${pad(mo)}-${pad(d)}`);
      facts.days.add(`${pad(mo)}-${pad(d)}`);
    });
    t = blank(t, DATE_SLASH, (m) => {
      facts.dates.add(`${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`);
      facts.days.add(`${pad(Number(m[2]))}-${pad(Number(m[1]))}`);
    });
    t = blank(t, DATE_DAY, (m) => facts.days.add(`${pad(monthOf(m[2]!))}-${pad(m[1] === '1er' ? 1 : Number(m[1]))}`));
    t = blank(t, DATE_DAY_SLASH, (m) => {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) facts.days.add(`${pad(mo)}-${pad(d)}`);
    });
    for (const m of t.matchAll(NUMBER)) facts.numbers.add(numberKey(m[1]!));
    for (const n of frenchNumberWords(t)) facts.numbers.add(String(n));
  }
  return facts;
}

/**
 * Dates et nombres significatifs du corps français. Retenus : toute date
 * (« 23 septembre 2026 », « 23/09/2026 », et « 23 septembre » sans année) ;
 * tout nombre d'au moins deux chiffres ou suivi de « % ». Écartés : les
 * années seules (1900-2099), « mois année » (« octobre 2024 »), le numéro de
 * semaine, la numérotation de liste, les ordinaux (« 19e »), les nombres
 * collés à des lettres (« T2 », « COVID-19 ») et les cibles de liens.
 */
export function extractBodyFacts(body: string): BodyFact[] {
  const out: BodyFact[] = [];
  const lines = normalizeText(body).split('\n');
  let h2Radar = false;
  let h3Radar = false;
  lines.forEach((original, i) => {
    const line = i + 1;
    const h = /^(#{2,6})\s/.exec(original);
    if (h) {
      const isRadar = /radar/i.test(original);
      if (h[1] === '##') {
        h2Radar = isRadar;
        h3Radar = false;
      } else h3Radar = isRadar;
    }
    const radar = h2Radar || h3Radar;
    let t = original.replace(/^\s*\d+[.)]\s/, (m) => ' '.repeat(m.length));
    t = t.replace(/\b(?:semaine|week|woche)\s+\d{1,2}\b/giu, (m) => ' '.repeat(m.length));
    t = t.replace(WEEK_SPAN, (m) => ' '.repeat(m.length));
    t = blank(t, DATE_FULL, (m) => {
      const d = m[1] === '1er' ? 1 : Number(m[1]);
      out.push({ kind: 'date', text: m[0]!, key: `${m[3]}-${pad(monthOf(m[2]!))}-${pad(d)}`, line, radar });
    });
    t = blank(t, DATE_SLASH, (m) => {
      out.push({ kind: 'date', text: m[0]!, key: `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`, line, radar });
    });
    t = blank(t, DATE_DAY, (m) => {
      out.push({ kind: 'date', text: m[0]!, key: `${pad(monthOf(m[2]!))}-${pad(m[1] === '1er' ? 1 : Number(m[1]))}`, line, radar });
    });
    t = blank(t, MONTH_YEAR);
    t = t.replace(/\b\d+(?:er|re|e|ème|eme)\b/giu, (m) => ' '.repeat(m.length));
    for (const m of t.matchAll(NUMBER)) {
      const approx = approximation(t.slice(0, m.index));
      const digits = m[1]!.replace(/\D/g, '');
      const pct = m[2] === '%';
      if (!pct && digits.length < 2) continue;
      if (!pct && /^(19|20)\d{2}$/.test(m[1]!)) continue; // année seule
      out.push({ kind: 'nombre', text: `${approx ? `${approx} ` : ''}${m[0]!.trim()}`, key: numberKey(m[1]!), line, radar, approx });
    }
  });
  return out;
}

/**
 * Nombre arrondi ancré : « plus de X » par une source entre X et X + 25 % ;
 * « moins de X » (ou « près de X ») entre X − 20 % et X ; « environ X » à
 * 10 % près. Un arrondi ne peut pas ancrer un nombre sans rapport.
 */
function approxAnchored(facts: Facts, key: string, approx: Approx): boolean {
  const x = numericValue(key);
  if (!Number.isFinite(x) || x === 0) return false;
  for (const k of facts.numbers) {
    const n = numericValue(k);
    if (!Number.isFinite(n)) continue;
    if (approx === 'plus de' && n >= x && n <= x * 1.25) return true;
    if (approx === 'moins de' && n <= x && n >= x * 0.8) return true;
    if (approx === 'environ' && Math.abs(n - x) <= x * 0.1) return true;
  }
  return false;
}

/** Sources de la semaine, en deux cercles. */
export interface WeekSources {
  /** Entrées du changelog de la semaine et signaux du radar datés de la semaine. */
  week: Facts;
  /** Signaux actifs plus anciens : n'ancrent que la section Radar. */
  olderRadar: Facts;
}

/**
 * Chaque date et chaque nombre significatif du corps français doit figurer
 * dans les sources que le générateur a reçues. Une date complète est ancrée si
 * la source porte la même date, ou le même jour sans année ; une date sans
 * année, si la source porte ce jour. Un nombre, si la source porte le même
 * nombre normalisé (« 12 000 », « 12.000 » et « 12 000 » insécable sont
 * égaux ; « 40 % » n'est PAS ancré par « 40,4 % »).
 *
 * Un nombre précédé de « plus de », « moins de », « environ »… est comparé
 * avec une tolérance (voir `approxAnchored`).
 *
 * Hors section Radar, seules les sources de la semaine comptent. Dans la
 * section Radar, les signaux actifs plus anciens comptent aussi : le
 * générateur les reçoit tous (plus de 400), et les ouvrir à tout le corps
 * ancrerait presque n'importe quel nombre. Limite assumée : dans la section
 * Radar, un petit nombre inventé passe s'il figure dans un autre signal.
 */
export function checkFacts(body: string, sources: WeekSources): DigestFinding[] {
  const out: DigestFinding[] = [];
  const has = (facts: Facts, f: BodyFact) =>
    f.kind === 'date'
      ? f.key.length === 10
        ? facts.dates.has(f.key) || facts.days.has(f.key.slice(5))
        : facts.days.has(f.key)
      : facts.numbers.has(f.key) || (f.approx !== undefined && approxAnchored(facts, f.key, f.approx));
  for (const f of extractBodyFacts(body)) {
    if (has(sources.week, f) || (f.radar && has(sources.olderRadar, f))) continue;
    const where = f.radar ? 'du changelog et du radar' : 'du changelog et des signaux du radar datés de la semaine';
    out.push({ rule: 'faits', level: 'error', lang: 'fr', line: f.line, message: `${f.kind} « ${f.text} » absent(e) des entrées ${where}` });
  }
  return out;
}

/** Entrée du changelog telle que le générateur la lit. */
export interface ChangelogLike {
  date: string;
  targetSlug?: string;
  descriptions?: { fr?: string };
}
/** Signal du radar tel que le générateur le lit. */
export interface RadarLike {
  /** Préfixé par la date de création du signal (« 2026-08-22-josaphat »). */
  id?: string;
  date: string;
  cards?: string[];
  promotedTo?: string | null;
  status?: string;
  archivedAt?: string | null;
  descriptions?: { fr?: string };
  summary?: { fr?: string };
}

/**
 * Textes que le générateur a pu recevoir pour la semaine, en deux cercles :
 * - `week` : descriptions françaises des entrées du changelog datées du lundi
 *   au dimanche, et des signaux du radar datés de la semaine ;
 * - `olderRadar` : signaux plus anciens encore actifs à ce moment (non
 *   archivés avant le lundi). bgm-ops (src/digest.ts) envoie TOUS les signaux
 *   actifs ; un signal ancien peut être cité dans la section Radar. Le statut
 *   actuel d'un signal n'est pas celui du jour de génération : seul un
 *   archivage daté d'avant la semaine l'écarte.
 *
 * Un signal mis à jour change de `date` (« 2026-08-22-josaphat » daté du
 * 29/09 après la veille du 29/09) : relu plus tard, il sortirait de la
 * semaine. La date de création, en tête de son `id`, le garde dans le cercle
 * des signaux anciens.
 */
export function weekSourceTexts(week: string, changelog: ChangelogLike[], radar: RadarLike[]): { week: string[]; olderRadar: string[] } {
  const { monday, sunday } = weekRange(week);
  const out = { week: [] as string[], olderRadar: [] as string[] };
  for (const e of changelog) {
    if (e.date >= monday && e.date <= sunday && e.descriptions?.fr) out.week.push(e.descriptions.fr);
  }
  for (const e of radar) {
    const born = /^\d{4}-\d{2}-\d{2}/.exec(e.id ?? '')?.[0];
    const first = born && born < e.date ? born : e.date;
    if (first > sunday) continue;
    if (e.archivedAt && e.archivedAt < monday) continue;
    const target = e.date >= monday && e.date <= sunday ? out.week : out.olderRadar;
    if (e.descriptions?.fr) target.push(e.descriptions.fr);
    if (e.summary?.fr) target.push(e.summary.fr);
  }
  return out;
}

/**
 * Fiches visées par les sources de la semaine : `targetSlug` des entrées du
 * changelog du lundi au dimanche, `cards` et `promotedTo` des signaux du radar
 * datés de la semaine. Les signaux plus anciens, envoyés aussi au générateur,
 * ne comptent pas : ils couvrent presque toutes les fiches du site.
 */
export function weekCardSlugs(week: string, changelog: ChangelogLike[], radar: RadarLike[]): Set<string> {
  const { monday, sunday } = weekRange(week);
  const out = new Set<string>();
  for (const e of changelog) if (e.date >= monday && e.date <= sunday && e.targetSlug) out.add(e.targetSlug);
  for (const e of radar) {
    if (e.date < monday || e.date > sunday) continue;
    for (const c of e.cards ?? []) out.add(c);
    if (e.promotedTo) out.add(e.promotedTo);
  }
  return out;
}
