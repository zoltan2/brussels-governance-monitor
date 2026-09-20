// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Lecture et validation du rapport hebdomadaire SEO (Search Console, Umami,
 * passage technique), déposé par bgm-seo-report.timer sur le VPS.
 *
 * Même mécanisme que traffic-status.ts : trois fichiers lus depuis le
 * répertoire déduit de DB_PATH, jamais d'appel réseau depuis l'application.
 * Un schemaVersion inconnu, un statut inconnu, un fichier absent ou un nombre
 * rendu en chaîne par Postgres (NaN, Infinity) ne produisent jamais un zéro
 * inventé : la valeur, ou le bloc entier, devient illisible plutôt que
 * trompeuse (« indisponible » côté affichage).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { describeFreshness, type Freshness } from './snapshot-freshness';

const SCHEMA_VERSION = 1;
// Le rapport est hebdomadaire : passé 8 jours sans relevé, ça doit se voir.
const STALE_AFTER_HOURS = 192;

type NomBloc = 'gsc' | 'umami' | 'crawl';

const STATUTS_CONNUS = ['ok', 'error', 'blocked'] as const;
type StatutConnu = (typeof STATUTS_CONNUS)[number];
export type StatutBloc = StatutConnu | 'absent' | 'format-inconnu';

export interface Totaux {
  clics: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
}

export interface PageGsc {
  url: string;
  clics: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  clicsPrecedents: number | null;
}

export interface RequeteGsc {
  requete: string;
  clics: number | null;
  impressions: number | null;
  position: number | null;
}

export interface OpportuniteTitre {
  url: string;
  impressions: number | null;
  position: number | null;
  ctr: number | null;
  ctrMedianBande: number | null;
  bande: string | null;
}

export interface ActionSuggeree {
  regle: string;
  url: string;
  preuve: string;
  titre: string | null;
  priorite: number | null;
}

export interface FenetreRapport {
  debut: string | null;
  fin: string | null;
  fuseau: string | null;
}

export interface GscDonnees {
  totaux: Totaux;
  totauxPrecedents: Totaux;
  clicsBelgique: number | null;
  clicsBelgiquePrecedents: number | null;
  fenetre: FenetreRapport | null;
  pages: PageGsc[];
  requetes: RequeteGsc[];
  partRequetes: number | null;
  opportunitesTitre: OpportuniteTitre[];
  actions: ActionSuggeree[];
}

export interface VisiteIa {
  source: string;
  visites: number | null;
}

export interface UmamiDonnees {
  visites: number | null;
  visitesIa: VisiteIa[];
  pagesEntree: number | null;
  profondeur: number | null;
  evenements: number | null;
}

export interface PageCrawl {
  url: string;
  statut: number | null;
  canonical: string | null;
}

export interface CrawlDonnees {
  pages: PageCrawl[];
  bloquees: number | null;
  echecs: number | null;
}

export interface Bloc<T> {
  status: StatutBloc;
  message: string | null;
  generatedAt: string | null;
  donnees: T | null;
}

export interface RapportSeo {
  blocs: {
    gsc: Bloc<GscDonnees>;
    umami: Bloc<UmamiDonnees>;
    crawl: Bloc<CrawlDonnees>;
  };
  fraicheur: {
    gsc: Freshness | null;
    umami: Freshness | null;
    crawl: Freshness | null;
  };
}

// --- Conversions strictes : jamais de zéro inventé -------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/** Rejette les chaînes (dont "NaN" et "Infinity" rendues par Postgres), les
 * NaN et les Infinity : seul un nombre fini est une mesure. */
function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asTotaux(value: unknown): Totaux {
  const record = asRecord(value);
  return {
    clics: asNumber(record.clics),
    impressions: asNumber(record.impressions),
    ctr: asNumber(record.ctr),
    position: asNumber(record.position),
  };
}

function asFenetre(value: unknown): FenetreRapport | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return {
    debut: asString(record.debut),
    fin: asString(record.fin),
    fuseau: asString(record.fuseau),
  };
}

function asPagesGsc(value: unknown): PageGsc[] {
  if (!Array.isArray(value)) return [];
  const pages: PageGsc[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const url = asString(record.url);
    if (url === null) continue; // pas d'URL, pas de ligne exploitable
    pages.push({
      url,
      clics: asNumber(record.clics),
      impressions: asNumber(record.impressions),
      ctr: asNumber(record.ctr),
      position: asNumber(record.position),
      clicsPrecedents: asNumber(record.clicsPrecedents),
    });
  }
  return pages;
}

function asRequetes(value: unknown): RequeteGsc[] {
  if (!Array.isArray(value)) return [];
  const requetes: RequeteGsc[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const requete = asString(record.requete);
    if (requete === null) continue;
    requetes.push({
      requete,
      clics: asNumber(record.clics),
      impressions: asNumber(record.impressions),
      position: asNumber(record.position),
    });
  }
  return requetes;
}

function asOpportunitesTitre(value: unknown): OpportuniteTitre[] {
  if (!Array.isArray(value)) return [];
  const opportunites: OpportuniteTitre[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const url = asString(record.url);
    if (url === null) continue;
    opportunites.push({
      url,
      impressions: asNumber(record.impressions),
      position: asNumber(record.position),
      ctr: asNumber(record.ctr),
      ctrMedianBande: asNumber(record.ctrMedianBande),
      bande: asString(record.bande),
    });
  }
  return opportunites;
}

/** Une action sans règle, URL ou preuve n'est pas exploitable : on l'écarte
 * plutôt que d'afficher un trou dans la tuile. */
function asActions(value: unknown): ActionSuggeree[] {
  if (!Array.isArray(value)) return [];
  const actions: ActionSuggeree[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const regle = asString(record.regle);
    const url = asString(record.url);
    const preuve = asString(record.preuve);
    if (regle === null || url === null || preuve === null) continue;
    actions.push({
      regle,
      url,
      preuve,
      titre: asString(record.titre),
      priorite: asNumber(record.priorite),
    });
  }
  return actions;
}

function asGscDonnees(value: unknown): GscDonnees {
  const record = asRecord(value);
  return {
    totaux: asTotaux(record.totaux),
    totauxPrecedents: asTotaux(record.totauxPrecedents),
    clicsBelgique: asNumber(record.clicsBelgique),
    clicsBelgiquePrecedents: asNumber(record.clicsBelgiquePrecedents),
    fenetre: asFenetre(record.fenetre),
    pages: asPagesGsc(record.pages),
    requetes: asRequetes(record.requetes),
    partRequetes: asNumber(record.partRequetes),
    opportunitesTitre: asOpportunitesTitre(record.opportunitesTitre),
    actions: asActions(record.actions),
  };
}

function asVisitesIa(value: unknown): VisiteIa[] {
  if (!Array.isArray(value)) return [];
  const visites: VisiteIa[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const source = asString(record.source);
    if (source === null) continue;
    visites.push({ source, visites: asNumber(record.visites) });
  }
  return visites;
}

function asUmamiDonnees(value: unknown): UmamiDonnees {
  const record = asRecord(value);
  return {
    visites: asNumber(record.visites),
    visitesIa: asVisitesIa(record.visitesIa),
    pagesEntree: asNumber(record.pagesEntree),
    profondeur: asNumber(record.profondeur),
    evenements: asNumber(record.evenements),
  };
}

function asPagesCrawl(value: unknown): PageCrawl[] {
  if (!Array.isArray(value)) return [];
  const pages: PageCrawl[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const url = asString(record.url);
    if (url === null) continue;
    pages.push({
      url,
      statut: asNumber(record.statut),
      canonical: asString(record.canonical),
    });
  }
  return pages;
}

function asCrawlDonnees(value: unknown): CrawlDonnees {
  const record = asRecord(value);
  return {
    pages: asPagesCrawl(record.pages),
    bloquees: asNumber(record.bloquees),
    echecs: asNumber(record.echecs),
  };
}

const PARSEURS_DONNEES = {
  gsc: asGscDonnees,
  umami: asUmamiDonnees,
  crawl: asCrawlDonnees,
} satisfies Record<NomBloc, (v: unknown) => unknown>;

// --- Enveloppe commune -------------------------------------------------

function blocIllisible<T>(status: StatutBloc): Bloc<T> {
  return { status, message: null, generatedAt: null, donnees: null };
}

function estStatutConnu(value: unknown): value is StatutConnu {
  return (
    typeof value === 'string' &&
    (STATUTS_CONNUS as readonly string[]).includes(value)
  );
}

function parseBloc<T>(raw: unknown, parseurDonnees: (v: unknown) => T): Bloc<T> {
  if (raw === null || typeof raw !== 'object') return blocIllisible('format-inconnu');
  const record = raw as Record<string, unknown>;

  // Contrat JSON commun, version 1 (contraintes-globales.md). Toute autre
  // version est un format qu'on ne sait pas encore lire : mieux vaut
  // l'afficher illisible que de deviner une correspondance de champs fausse.
  if (record.schemaVersion !== SCHEMA_VERSION) return blocIllisible('format-inconnu');

  if (!estStatutConnu(record.status)) return blocIllisible('format-inconnu');

  const generatedAt = asString(record.generatedAt);
  const message = asString(record.message);
  // error/blocked n'ont jamais de donnees exploitables dans le contrat (le
  // crawl bloqué par Cloudflare écrit `donnees: null`) : on ne tente même
  // pas de les parser, ce qui évite tout plantage sur un null inattendu.
  const donnees = record.status === 'ok' ? parseurDonnees(record.donnees) : null;

  return { status: record.status, message, generatedAt, donnees };
}

async function lireBloc<T>(
  nom: NomBloc,
  dir: string,
  parseurDonnees: (v: unknown) => T,
): Promise<Bloc<T>> {
  try {
    const contenu = await readFile(join(dir, `seo-${nom}.json`), 'utf8');
    return parseBloc(JSON.parse(contenu), parseurDonnees);
  } catch {
    // Fichier absent (timer jamais passé, ou en panne cette semaine-là) ou
    // JSON illisible : une panne, pas un rapport vide à zéro.
    return blocIllisible('absent');
  }
}

export async function readSeoReport(): Promise<RapportSeo> {
  const dbPath = process.env.DB_PATH;

  if (!dbPath) {
    // Dev local ou Vercel : pas de volume de données.
    return {
      blocs: {
        gsc: blocIllisible('absent'),
        umami: blocIllisible('absent'),
        crawl: blocIllisible('absent'),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    };
  }

  const dir = join(dirname(dbPath), 'seo-report');
  const [gsc, umami, crawl] = await Promise.all([
    lireBloc('gsc', dir, PARSEURS_DONNEES.gsc),
    lireBloc('umami', dir, PARSEURS_DONNEES.umami),
    lireBloc('crawl', dir, PARSEURS_DONNEES.crawl),
  ]);

  return {
    blocs: { gsc, umami, crawl },
    fraicheur: {
      gsc: describeFreshness(gsc.generatedAt, { staleAfterHours: STALE_AFTER_HOURS }),
      umami: describeFreshness(umami.generatedAt, { staleAfterHours: STALE_AFTER_HOURS }),
      crawl: describeFreshness(crawl.generatedAt, { staleAfterHours: STALE_AFTER_HOURS }),
    },
  };
}
