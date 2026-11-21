// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Brouillon structuré d'une veille, et calcul de ce qu'il écrit.
 *
 * Une veille écrit toujours la même chose : une section de fiche en quatre
 * langues, le frontmatter (lastModified, changeSummary, changeSummaryDate, une
 * source), une entrée de changelog par fiche et des signaux radar. Jusqu'au
 * 13/10/2026, chaque veille réécrivait un script jetable pour le faire, avec
 * sa propre mesure de l'accroche, qui ne coupait pas comme `leadSplit` : trois
 * textes validés ont été raccourcis après coup ce jour-là, et une date
 * allemande a bloqué un push.
 *
 * Ici, le brouillon ne porte que le texte et les choix. Tout le reste se
 * déduit : la section du changelog vient du dossier de la fiche, les textes du
 * changelog et du radar sont le `changeSummary` de la fiche (une seule source,
 * donc une correction se fait à un seul endroit), `accessedAt`, `lastVeille`
 * et `period` se calculent.
 *
 * `planifier` ne lit le dépôt que par les deux fonctions de `Depot` et n'écrit
 * rien : il rend les nouveaux contenus et la liste de TOUS les problèmes, pas
 * seulement le premier. Un plan qui a un problème ne s'écrit pas, même en
 * partie (le 13/10, un script arrêté à mi-course avait laissé une langue
 * modifiée sur quatre).
 *
 * En-tête (18/11/2026) : `entete` remplace un texte exact dans `summary`,
 * `summaryFalc`, `whyStatus`, `concreteImpact`, `metrics` ou `faq`, et rien
 * d'autre. Le compte rendu du 18/11 renvoyait à la main le chapeau et la FAQ
 * du survol, la FAQ sécurité et le chiffre clé de la LEZ. Le fichier relu par
 * le vrai parseur ne doit différer que dans les champs déclarés, et le texte
 * neuf doit s'y lire tel quel.
 *
 * `humanImpact` (fiche secteur) s'y ajoute le 21/11/2026, et `coalition`
 * (fiche commune) se remplace en entier : ces deux relectures revenaient « à la
 * main » chaque jour.
 *
 * `changeType` (21/11/2026) : l'entrée du changelog écrite ici est `updated`,
 * la fiche doit le dire aussi (src/lib/change-type-consistency.ts). Une fiche en
 * `corrected`, `added` ou `new` passe donc à `updated` ; `status-change` et
 * `data-refresh`, équivalents de `updated` sur une fiche domaine, restent. Du 19
 * au 21/11, ce refus renvoyait chaque jour une fiche « à écrire à la main ».
 * Un `digestHeadline` est retiré (voir retirerDigestHeadline).
 *
 * Hors périmètre, refusé plutôt que deviné : création d'une fiche, `changeType`
 * `removed`, `title`, alertes, fiches comparaison
 * et solution, engagements, quiz. Les dates de relecture (`statusReviewed`, `faqReviewed`,
 * `impactReviewed`, `summaryReviewed`) ne sont posées que si le brouillon les
 * déclare dans `relectures` : une attestation se déclare, elle ne se déduit pas.
 */

import yaml from 'js-yaml';
import { z } from 'zod';
import { SECTION_OF_DIR } from '../../src/lib/change-type-consistency';
import { findDuplicateSources } from '../../src/lib/duplicate-sources';
import { FrontmatterError, readGuardFrontmatter } from '../../src/lib/frontmatter';
import { leadHeadlineProblem } from '../../src/lib/lead-headline-check';
import { leadSplit } from '../../src/lib/lead-split';
import { radarSummaryProblems } from '../../src/lib/radar-summary-check';

export const LOCALES = ['fr', 'nl', 'en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export type ParLangue = Record<Locale, string>;

export const CHANGELOG = 'data/changelog.json';
export const RADAR = 'data/radar.json';
/** Indentation de chaque fichier de données : lue dans le dépôt, jamais devinée. */
const INDENTATION = { [CHANGELOG]: 4, [RADAR]: 2 } as const;

const COLLECTIONS = ['domain-cards', 'commune-cards', 'sector-cards', 'dossiers'] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const JOUR = /^\d{4}-\d{2}-\d{2}$/;

const texte = z.string().refine((v) => v.trim().length > 0, 'texte vide');
const parLangue = z.object({ fr: texte, nl: texte, en: texte, de: texte }).strict();

const operation = z
  .object({
    op: z.enum(['avant', 'apres', 'remplacer', 'fin']),
    ancre: parLangue.optional(),
    texte: parLangue,
  })
  .strict()
  .refine((o) => (o.op === 'fin') === (o.ancre === undefined), {
    message: 'ancre obligatoire pour avant, apres et remplacer, interdite pour fin',
  });

/** Champs de l'en-tête que le brouillon peut retoucher, et leur longueur maximale (velite.config.ts). */
export const CHAMPS_ENTETE = { summary: 500, summaryFalc: 200, whyStatus: 600, concreteImpact: 700, humanImpact: null, metrics: null, faq: null } as const;
type ChampEntete = keyof typeof CHAMPS_ENTETE;

const retouche = z
  .object({
    champ: z.enum(Object.keys(CHAMPS_ENTETE) as [ChampEntete, ...ChampEntete[]]),
    ancre: parLangue,
    texte: parLangue,
  })
  .strict();

const fiche = z
  .object({
    fiche: z.string().regex(new RegExp(`^(${COLLECTIONS.join('|')})/${SLUG.source.slice(1, -1)}$`), {
      message: `attendu <dossier>/<slug>, dossier parmi ${COLLECTIONS.join(', ')}`,
    }),
    changeSummary: parLangue,
    relectures: z.array(z.enum(['statusReviewed', 'faqReviewed', 'impactReviewed', 'summaryReviewed'])).default([]),
    sources: z
      .array(z.object({ url: z.url(), type: z.string().regex(/^[a-z]+$/), label: parLangue }).strict())
      .default([]),
    entete: z.array(retouche).default([]),
    /** Fiche commune : la liste entière, identique dans les quatre langues. */
    coalition: z.array(texte).min(1).optional(),
    corps: z.array(operation).default([]),
  })
  .strict()
  .refine((f) => f.corps.length + f.entete.length > 0 || f.coalition !== undefined, { message: 'ni corps ni entete : rien à écrire' })
  .refine((f) => f.coalition === undefined || f.fiche.startsWith('commune-cards/'), {
    message: 'coalition : fiche commune seulement',
    path: ['coalition'],
  });

const identifiant = z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/, 'attendu AAAA-MM-JJ-slug');

const signal = z
  .object({
    id: identifiant,
    /** true : le signal existe déjà et son contenu est remplacé (même id, remis en tête). */
    remplace: z.boolean().default(false),
    confidence: z.enum(['official', 'estimated', 'unconfirmed']),
    cards: z.array(z.string().regex(SLUG)).min(1),
    promotedTo: z.string().regex(SLUG).nullable(),
    /** Seulement si le slug existe dans deux collections. */
    promotedSection: z.enum(['domains', 'dossiers', 'communes', 'sectors']).optional(),
    source: z.object({ label: texte, url: z.url() }).strict(),
    summary: parLangue.optional(),
    descriptions: parLangue.optional(),
    nextStep: parLangue,
  })
  .strict();

const archivage = z.object({ archiver: identifiant }).strict();

const brouillon = z
  .object({
    date: z.string().regex(JOUR, 'attendu AAAA-MM-JJ'),
    fiches: z.array(fiche).default([]),
    radar: z.array(z.union([archivage, signal])).default([]),
  })
  .strict()
  .refine((b) => b.fiches.length + b.radar.length > 0, { message: 'brouillon vide : ni fiche ni signal radar' });

export type Brouillon = z.infer<typeof brouillon>;
type Fiche = Brouillon['fiches'][number];
type Signal = z.infer<typeof signal>;

/** Lit un brouillon YAML. Les dates restent des chaînes (schéma JSON de js-yaml). */
export function lireBrouillon(source: string): { brouillon: Brouillon } | { problemes: string[] } {
  let brut: unknown;
  try {
    brut = yaml.load(source, { schema: yaml.JSON_SCHEMA });
  } catch (err) {
    return { problemes: [`YAML illisible : ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`] };
  }
  const lu = brouillon.safeParse(brut);
  if (lu.success) return { brouillon: lu.data };
  return { problemes: lu.error.issues.map((i) => `${i.path.join('.') || 'brouillon'} : ${i.message}`) };
}

/** Accès au dépôt : l'arbre de travail, et la branche de base (origin/main). null = fichier absent. */
export interface Depot {
  lire(chemin: string): string | null;
  lireBase(chemin: string): string | null;
}

export interface Plan {
  /** Tous les problèmes trouvés. Non vide : rien ne doit être écrit. */
  problemes: string[];
  /** Remarques qui ne bloquent pas. */
  avertissements: string[];
  /** Chemin (relatif à la racine) → nouveau contenu. */
  ecritures: Map<string, string>;
  /** Fiches MDX touchées, pour les contrôles qui prennent une liste. */
  mdx: string[];
  /** Résumé d'une ligne par fiche, puis radar et changelog. */
  lignes: string[];
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;

/**
 * Pose `cle: "valeur"` dans un frontmatter, ligne à ligne. Le YAML n'est jamais
 * re-sérialisé : l'ordre des clés, les commentaires et les guillemets des
 * autres lignes ne bougent pas. `JSON.stringify` donne un scalaire YAML entre
 * guillemets doubles valide, guillemets droits compris.
 */
function poserScalaire(lignes: string[], cle: string, valeur: string, apres: string): string | null {
  const indices = lignes.flatMap((l, i) => (l.startsWith(`${cle}:`) ? [i] : []));
  if (indices.length > 1) return `${cle} présent ${indices.length} fois dans le frontmatter`;
  const ligne = `${cle}: ${JSON.stringify(valeur)}`;
  if (indices.length === 1) {
    const i = indices[0]!;
    const reste = lignes[i]!.slice(cle.length + 1).trim();
    if (/^[>|]/.test(reste) || /^\s/.test(lignes[i + 1] ?? '')) {
      return `${cle} est écrit sur plusieurs lignes : à remettre sur une ligne avant d'appliquer`;
    }
    lignes[i] = ligne;
    return null;
  }
  const ancre = lignes.findIndex((l) => l.startsWith(`${apres}:`));
  if (ancre < 0) return `${cle} absent, et ${apres} introuvable pour l'insérer`;
  lignes.splice(ancre + 1, 0, ligne);
  return null;
}

function ajouterSources(lignes: string[], sources: Fiche['sources'], locale: Locale, date: string): string | null {
  const i = lignes.indexOf('sources:');
  if (i < 0) {
    return lignes.some((l) => l.startsWith('sources:'))
      ? 'sources: [] ou liste en ligne : ajouter la première source à la main'
      : 'pas de champ sources dans le frontmatter (fiche secteur : la source reste dans le corps)';
  }
  if (!/^ {2}- /.test(lignes[i + 1] ?? '')) return 'liste sources: dans une forme inattendue (attendu « - » indenté de deux espaces)';
  const bloc = sources.flatMap((s) => [
    `  - label: ${JSON.stringify(s.label[locale])}`,
    `    url: ${JSON.stringify(s.url)}`,
    `    type: ${s.type}`,
    `    accessedAt: ${JSON.stringify(date)}`,
  ]);
  lignes.splice(i + 1, 0, ...bloc);
  return null;
}

/** Applique une opération au corps. Rend le nouveau corps, ou le problème. */
export function appliquerOperation(
  corps: string,
  op: Fiche['corps'][number]['op'],
  ancre: string | undefined,
  nouveau: string,
): { corps: string } | { probleme: string } {
  const bloc = nouveau.trimEnd();
  if (op !== 'remplacer' && corps.includes(bloc)) return { probleme: 'texte déjà présent dans la fiche (brouillon déjà appliqué ?)' };
  if (op === 'fin') return { corps: `${corps.trimEnd()}\n\n${bloc}\n` };

  const a = ancre!;
  const n = corps.split(a).length - 1;
  if (n !== 1) return { probleme: `ancre ${n === 0 ? 'introuvable' : `présente ${n} fois`} : « ${a.slice(0, 80)} »` };
  const i = corps.indexOf(a);
  if (op === 'remplacer') return { corps: corps.slice(0, i) + nouveau.replace(/\n$/, '') + corps.slice(i + a.length) };
  if (op === 'avant') {
    if (i > 0 && corps[i - 1] !== '\n') return { probleme: `ancre de « avant » pas en début de ligne : « ${a.slice(0, 80)} »` };
    return { corps: `${corps.slice(0, i)}${bloc}\n\n${corps.slice(i)}` };
  }
  // apres : à la fin du paragraphe qui contient l'ancre.
  const fin = corps.indexOf('\n\n', i);
  if (fin < 0) return { corps: `${corps.trimEnd()}\n\n${bloc}\n` };
  return { corps: `${corps.slice(0, fin)}\n\n${bloc}${corps.slice(fin)}` };
}

/** Forme d'un texte dans un scalaire YAML entre guillemets doubles. */
const echapper = (t: string) => JSON.stringify(t).slice(1, -1);
const CLE_RACINE = /^[A-Za-z_][\w-]*:/;

/**
 * Remplace `ancre` par `texte` dans le bloc de `champ` (de sa ligne à la clé
 * racine suivante). L'ancre est cherchée sous sa forme échappée et doit y
 * figurer une fois. Rend les lignes modifiées, ou le problème.
 */
export function retoucherEntete(lignes: string[], champ: string, ancre: string, texte: string): { lignes: string[] } | { probleme: string } {
  if (/\n/.test(ancre) || /\n/.test(texte)) return { probleme: `${champ} : ancre et texte tiennent sur une ligne (un seul scalaire)` };
  const debuts = lignes.flatMap((l, i) => (l.startsWith(`${champ}:`) ? [i] : []));
  if (debuts.length !== 1) return { probleme: `${champ} ${debuts.length === 0 ? 'absent' : `présent ${debuts.length} fois`} dans le frontmatter` };
  const debut = debuts[0]!;
  let fin = lignes.findIndex((l, i) => i > debut && CLE_RACINE.test(l));
  if (fin < 0) fin = lignes.length;
  const bloc = lignes.slice(debut, fin).join('\n');
  const a = echapper(ancre);
  const n = bloc.split(a).length - 1;
  if (n !== 1) return { probleme: `${champ} : ancre ${n === 0 ? 'introuvable' : `présente ${n} fois`} : « ${ancre.slice(0, 80)} »` };
  const neuf = bloc.replace(a, () => echapper(texte));
  return { lignes: [...lignes.slice(0, debut), ...neuf.split('\n'), ...lignes.slice(fin)] };
}

/** Toutes les chaînes d'une valeur YAML lue. */
function feuilles(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(feuilles);
  if (v && typeof v === 'object') return Object.values(v).flatMap(feuilles);
  return [];
}

function jour(valeur: unknown): string | undefined {
  return typeof valeur === 'string' ? valeur.slice(0, 10) : undefined;
}

/** Valeurs de `changeType` qu'une mise à jour garde telles quelles. */
const TYPES_GARDES = new Set(['updated', 'status-change', 'data-refresh']);
/** Valeurs qu'une mise à jour remplace par `updated`. */
const TYPES_REMPLACES = new Set(['corrected', 'added', 'new']);

/** Met `changeType` d'accord avec l'entrée `updated` du changelog. Rend le problème, ou null. */
function poserChangeType(lignes: string[]): string | null {
  const indices = lignes.flatMap((l, i) => (l.startsWith('changeType:') ? [i] : []));
  if (indices.length !== 1) return `changeType ${indices.length === 0 ? 'absent' : `présent ${indices.length} fois`} dans le frontmatter`;
  const i = indices[0]!;
  const valeur = lignes[i]!.slice('changeType:'.length).trim().replace(/^["']|["']$/g, '');
  if (TYPES_GARDES.has(valeur)) return null;
  if (!TYPES_REMPLACES.has(valeur)) return `changeType « ${valeur} » : hors périmètre, à traiter à la main`;
  lignes[i] = 'changeType: updated';
  return null;
}

/**
 * Retire `digestHeadline` : il prime sur la première phrase de `changeSummary`
 * dans le digest (src/lib/lead-split.ts), et celui d'une mise à jour passée
 * titrerait le digest de la semaine (dossier taxis, titre du 22/09 toujours là
 * le 21/11/2026). Rend le problème, ou null.
 */
function retirerDigestHeadline(lignes: string[]): string | null {
  const i = lignes.findIndex((l) => l.startsWith('digestHeadline:'));
  if (i < 0) return null;
  const reste = lignes[i]!.slice('digestHeadline:'.length).trim();
  if (!reste || /^[>|]/.test(reste) || /^\s/.test(lignes[i + 1] ?? '')) return 'digestHeadline écrit sur plusieurs lignes : à retirer à la main';
  lignes.splice(i, 1);
  return null;
}

/** Remplace la liste `coalition:` (éléments « - » indentés de deux espaces). Rend le problème, ou null. */
function remplacerCoalition(lignes: string[], partis: string[]): string | null {
  const indices = lignes.flatMap((l, i) => (l.startsWith('coalition:') ? [i] : []));
  if (indices.length !== 1) return `coalition ${indices.length === 0 ? 'absent' : `présent ${indices.length} fois`} dans le frontmatter`;
  const i = indices[0]!;
  if (lignes[i]!.trim() !== 'coalition:') return 'coalition écrite en ligne : à remettre en liste avant d\'appliquer';
  let fin = i + 1;
  while (fin < lignes.length && /^ {2}- /.test(lignes[fin]!)) fin++;
  if (fin < lignes.length && !CLE_RACINE.test(lignes[fin]!)) return 'liste coalition: dans une forme inattendue (attendu « - » indenté de deux espaces)';
  lignes.splice(i + 1, fin - i - 1, ...partis.map((p) => `  - ${JSON.stringify(p)}`));
  return null;
}

function planifierFiche(f: Fiche, date: string, depot: Depot, plan: Plan): void {
  const accroches: string[] = [];
  for (const l of LOCALES) {
    const chemin = `content/${f.fiche}.${l}.mdx`;
    const ici = (m: string) => plan.problemes.push(`${chemin} : ${m}`);
    const brut = depot.lire(chemin);
    if (brut === null) {
      ici('fichier absent (la création de fiche est hors périmètre)');
      continue;
    }
    const tete = FRONTMATTER.exec(brut);
    if (!tete) {
      ici('frontmatter introuvable');
      continue;
    }

    const base = depot.lireBase(chemin);
    let baseLue: Record<string, unknown> | null = null;
    try {
      baseLue = base === null ? null : readGuardFrontmatter(base);
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
    }
    if (jour(baseLue?.lastModified) === date) {
      ici(`déjà datée du ${date} sur la branche de base : une fiche fusionnée aujourd'hui ne se retouche pas dans une autre PR (contrôle lastModified de la CI)`);
    }

    let lignes = tete[1]!.split('\n');
    for (const r of f.entete) {
      const res = retoucherEntete(lignes, r.champ, r.ancre[l], r.texte[l]);
      if ('probleme' in res) ici(`entete : ${res.probleme}`);
      else lignes = res.lignes;
    }
    const type = poserChangeType(lignes);
    if (type) ici(type);
    if (f.coalition) {
      const c = remplacerCoalition(lignes, f.coalition);
      if (c) ici(c);
    }
    const sansTitre = retirerDigestHeadline(lignes);
    if (sansTitre) ici(sansTitre);

    const cs = f.changeSummary[l].trim();
    const poses: [string, string][] = [
      ['lastModified', date],
      ['changeSummary', cs],
      ['changeSummaryDate', date],
      ...f.relectures.map((r): [string, string] => [r, date]),
    ];
    if (!lignes.some((x) => x.startsWith('lastModified:'))) ici('lastModified absent du frontmatter');
    else for (const [cle, valeur] of poses) {
      const p = poserScalaire(lignes, cle, valeur, cle === 'changeSummaryDate' ? 'changeSummary' : 'lastModified');
      if (p) ici(p);
    }
    if (f.sources.length > 0) {
      const p = ajouterSources(lignes, f.sources, l, date);
      if (p) ici(p);
    }

    let corps = brut.slice(tete[0].length);
    f.corps.forEach((o, n) => {
      const r = appliquerOperation(corps, o.op, o.ancre?.[l], o.texte[l]);
      if ('probleme' in r) ici(`corps[${n}] (${o.op}) : ${r.probleme}`);
      else corps = r.corps;
    });

    const nouveau = `---\n${lignes.join('\n')}\n---\n${corps}`;
    // Relecture par le vrai parseur : ce que les gardes et Velite liront.
    try {
      const lu = readGuardFrontmatter(nouveau) ?? {};
      if (lu.changeSummary !== cs) ici('changeSummary relu différent de celui du brouillon');
      if (jour(lu.lastModified) !== date || jour(lu.changeSummaryDate) !== date) ici('dates relues différentes de celle du brouillon');
      for (const d of findDuplicateSources(lu.sources)) ici(`source citée deux fois : ${d.url}`);
      if (f.entete.length > 0 || f.coalition) controlerEntete(f, l, readGuardFrontmatter(brut) ?? {}, lu, ici);
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      ici(`frontmatter illisible après écriture : ${err.message}`);
    }

    const titre = leadHeadlineProblem(cs, l);
    if (titre) ici(`changeSummary : ${titre}`);
    accroches.push(`${l} ${leadSplit(cs).headline.length}`);
    if (/—/.test(cs + f.corps.map((o) => o.texte[l]).join(''))) plan.avertissements.push(`${chemin} : tiret cadratin dans le texte nouveau`);

    plan.ecritures.set(chemin, nouveau);
    plan.mdx.push(chemin);
  }
  plan.lignes.push(
    `${f.fiche} : ${f.corps.length} opération(s), ${f.entete.length} retouche(s) d'en-tête${f.coalition ? ', coalition remplacée' : ''}, ${f.sources.length} source(s), accroche (120 au plus) ${accroches.join(' · ')}`,
  );
}

/**
 * Ce que l'en-tête relu doit vérifier après une retouche : aucun autre champ
 * n'a bougé (hors dates, accroche, relectures et sources que le brouillon pose
 * lui-même), le texte neuf se lit dans son champ, la longueur tient.
 */
function controlerEntete(f: Fiche, l: Locale, avant: Record<string, unknown>, apres: Record<string, unknown>, ici: (m: string) => void): void {
  const libres = new Set<string>(['lastModified', 'changeSummary', 'changeSummaryDate', 'changeType', 'digestHeadline', 'sources', ...f.relectures, ...f.entete.map((r) => r.champ)]);
  if (f.coalition) {
    libres.add('coalition');
    if (JSON.stringify(apres.coalition) !== JSON.stringify(f.coalition)) ici('coalition relue différente de celle du brouillon');
  }
  for (const cle of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
    if (!libres.has(cle) && JSON.stringify(avant[cle]) !== JSON.stringify(apres[cle])) ici(`entete : ${cle} a changé sans être déclaré`);
  }
  for (const r of f.entete) {
    if (!feuilles(apres[r.champ]).some((t) => t.includes(r.texte[l]))) ici(`entete : ${r.champ} relu sans le texte neuf (scalaire hors guillemets doubles ?)`);
    const max = CHAMPS_ENTETE[r.champ];
    const v = apres[r.champ];
    if (max !== null && typeof v === 'string' && v.length > max) ici(`entete : ${r.champ} fait ${v.length} caractères, ${max} au plus (Velite écarterait la fiche)`);
  }
}

function lireJson(chemin: keyof typeof INDENTATION, depot: Depot, plan: Plan): unknown | null {
  const brut = depot.lire(chemin);
  if (brut === null) {
    plan.problemes.push(`${chemin} : fichier absent`);
    return null;
  }
  const lu = JSON.parse(brut) as unknown;
  // Garantit que l'écriture ne changera que ce que le brouillon demande.
  if (`${JSON.stringify(lu, null, INDENTATION[chemin])}\n` !== brut) {
    plan.problemes.push(`${chemin} : le fichier ne se réécrit pas à l'identique (indentation ${INDENTATION[chemin]} attendue)`);
    return null;
  }
  return lu;
}

interface EntreeChangelog {
  date: string;
  type: string;
  section: string;
  targetSlug: string | null;
  descriptions: ParLangue;
}

function planifierChangelog(b: Brouillon, depot: Depot, plan: Plan): void {
  if (b.fiches.length === 0) return;
  const journal = lireJson(CHANGELOG, depot, plan) as EntreeChangelog[] | null;
  if (!journal) return;
  const ajouts: EntreeChangelog[] = [];
  for (const f of b.fiches) {
    const [dossier, slug] = f.fiche.split('/') as [string, string];
    const section = SECTION_OF_DIR[`content/${dossier}`]!;
    if (journal.some((e) => e.date === b.date && e.section === section && e.targetSlug === slug)) {
      plan.problemes.push(`${CHANGELOG} : une entrée ${section}/${slug} existe déjà au ${b.date}`);
    }
    ajouts.push({ date: b.date, type: 'updated', section, targetSlug: slug, descriptions: trim(f.changeSummary) });
  }
  plan.ecritures.set(CHANGELOG, `${JSON.stringify([...ajouts, ...journal], null, INDENTATION[CHANGELOG])}\n`);
  plan.lignes.push(`changelog : ${ajouts.length} entrée(s) en tête`);
}

function trim(t: ParLangue): ParLangue {
  return { fr: t.fr.trim(), nl: t.nl.trim(), en: t.en.trim(), de: t.de.trim() };
}

interface SignalRadar {
  id: string;
  status?: string;
  archivedAt?: string | null;
  period?: string;
  [cle: string]: unknown;
}

/** Section d'un slug promu : la fiche du brouillon d'abord, sinon le dossier où le slug existe. */
function sectionPromue(s: Signal, b: Brouillon, depot: Depot): { section: string } | { probleme: string } {
  if (s.promotedSection) return { section: s.promotedSection };
  const dossiers = COLLECTIONS.filter((d) => b.fiches.some((f) => f.fiche === `${d}/${s.promotedTo}`));
  const trouves = dossiers.length > 0 ? dossiers : COLLECTIONS.filter((d) => depot.lire(`content/${d}/${s.promotedTo}.fr.mdx`) !== null);
  if (trouves.length === 1) return { section: SECTION_OF_DIR[`content/${trouves[0]}`]! };
  return {
    probleme:
      trouves.length === 0
        ? `promotedTo « ${s.promotedTo} » ne correspond à aucune fiche`
        : `promotedTo « ${s.promotedTo} » existe dans ${trouves.join(' et ')} : préciser promotedSection`,
  };
}

function planifierRadar(b: Brouillon, depot: Depot, plan: Plan): void {
  if (b.radar.length === 0) return;
  const radar = lireJson(RADAR, depot, plan) as { lastVeille?: string; entries: SignalRadar[] } | null;
  if (!radar) return;
  const period = radar.entries.find((e) => typeof e.period === 'string')?.period;
  const nouveaux: SignalRadar[] = [];
  let archives = 0;
  let remplaces = 0;

  for (const item of b.radar) {
    if ('archiver' in item) {
      const cible = radar.entries.find((e) => e.id === item.archiver);
      if (!cible) plan.problemes.push(`radar : signal à archiver introuvable, ${item.archiver}`);
      else if (cible.status === 'archived') plan.problemes.push(`radar : ${item.archiver} est déjà archivé`);
      else {
        cible.status = 'archived';
        cible.archivedAt = b.date;
        archives++;
      }
      continue;
    }
    const ici = (m: string) => plan.problemes.push(`radar ${item.id} : ${m}`);
    const existant = radar.entries.findIndex((e) => e.id === item.id);
    if (item.remplace && existant < 0) ici('remplace: true, mais ce signal n\'existe pas');
    if (!item.remplace && (existant >= 0 || nouveaux.some((n) => n.id === item.id))) ici('cet identifiant existe déjà (remplace: true pour le réécrire)');
    if (item.remplace && existant >= 0) {
      radar.entries.splice(existant, 1);
      remplaces++;
    }

    let section: string | undefined;
    if (item.promotedTo !== null) {
      const r = sectionPromue(item, b, depot);
      if ('probleme' in r) ici(r.probleme);
      else section = r.section;
    }
    // Sans texte propre, le signal reprend le changeSummary de la fiche promue.
    const source = b.fiches.find((f) => f.fiche.endsWith(`/${item.promotedTo}`))?.changeSummary;
    const descriptions = item.descriptions ?? source;
    const summary = item.summary ?? (source && (Object.fromEntries(LOCALES.map((l) => [l, leadSplit(source[l].trim()).headline])) as ParLangue));
    if (!descriptions || !summary) {
      ici('summary et descriptions obligatoires quand la fiche promue n\'est pas dans le brouillon');
      continue;
    }
    for (const p of radarSummaryProblems({ id: item.id, summary })) ici(p);

    nouveaux.push({
      id: item.id,
      date: b.date,
      confidence: item.confidence,
      status: 'active',
      cards: item.cards,
      ...(section ? { promotedSection: section } : {}),
      promotedTo: item.promotedTo,
      archivedAt: null,
      ...(period ? { period } : {}),
      source: { label: item.source.label.trim(), url: item.source.url, accessedAt: b.date },
      summary: trim(summary),
      descriptions: trim(descriptions),
      nextStep: trim(item.nextStep),
    });
  }

  const sortie = { ...radar, lastVeille: b.date, entries: [...nouveaux, ...radar.entries] };
  plan.ecritures.set(RADAR, `${JSON.stringify(sortie, null, INDENTATION[RADAR])}\n`);
  plan.lignes.push(`radar : ${nouveaux.length - remplaces} ajouté(s), ${remplaces} remplacé(s), ${archives} archivé(s)`);
}

/** Calcule tout ce que le brouillon écrirait, sans rien écrire. */
export function planifier(b: Brouillon, depot: Depot): Plan {
  const plan: Plan = { problemes: [], avertissements: [], ecritures: new Map(), mdx: [], lignes: [] };
  const vues = new Set<string>();
  for (const f of b.fiches) {
    if (vues.has(f.fiche)) plan.problemes.push(`${f.fiche} : fiche présente deux fois dans le brouillon`);
    vues.add(f.fiche);
    planifierFiche(f, b.date, depot, plan);
  }
  planifierChangelog(b, depot, plan);
  planifierRadar(b, depot, plan);
  return plan;
}
