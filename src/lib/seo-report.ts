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

export interface FenetreRapport {
  debut: string | null;
  fin: string | null;
  fuseau: string | null;
}

export interface ActionSuggeree {
  regle: string;
  url: string;
  preuve: string;
  titre: string | null;
  priorite: number | null;
  fenetre: FenetreRapport | null;
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

export interface PageEntree {
  chemin: string;
  visites: number | null;
  visitesIa: number | null;
}

export interface UmamiDonnees {
  visites: number | null;
  // null = champ absent ou du mauvais type (donnée manquante, indisponible
  // à l'affichage) ; [] = la requête SQL a répondu par COALESCE(..., '[]')
  // faute de ligne correspondante (zéro visite d'assistant CONSTATÉ cette
  // semaine, un vrai zéro, pas une panne).
  visitesIa: VisiteIa[] | null;
  // Trié par visites décroissantes, au plus 50 entrées côté producteur
  // (bloc-umami.mjs) : ce module ne re-trie ni ne tronque, il valide.
  pagesEntree: PageEntree[];
  profondeur: number | null;
  evenements: number | null;
}

export interface PageCrawl {
  url: string;
  statut: number | null;
  canonical: string | null;
  // La sonde (analyserPage, bgm-ops) contrôle aussi ces trois champs : les
  // exposer permet de distinguer « tout va bien » de « pas affiché », sans
  // quoi une page sans titre ni hreflang se confond avec une page saine.
  titre: string | null;
  description: string | null;
  hreflang: string[];
}

export interface CrawlDonnees {
  // Même distinction que visitesIa : null = tableau absent ou du mauvais
  // type (donnée manquante), [] = tableau présent et vide (zéro page
  // constatée, pas une panne de lecture).
  pages: PageCrawl[] | null;
  bloquees: number | null;
  echecs: number | null;
}

export interface Bloc<T> {
  status: StatutBloc;
  message: string | null;
  generatedAt: string | null;
  // Empreinte du script qui a produit ce fichier (contrat JSON commun) :
  // dépôt et VPS peuvent diverger, la CI ne déployant pas deploy/. Affichée
  // par la page /fr/admin/rapport pour rendre cet écart visible.
  scriptSha256: string | null;
  // Fenêtre d'analyse au premier niveau du contrat commun (pas celle,
  // spécifique au bloc GSC, nichée dans donnees.fenetre pour dater ses
  // preuves). Search Console est en heure du Pacifique, Umami en UTC : les
  // afficher côte à côte évite de rapprocher deux chiffres dont les
  // périodes ne coïncident pas sans le dire.
  fenetre: FenetreRapport | null;
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

/** Comme asNumber, mais exige un entier : un comptage d'événements n'est
 * jamais une fraction, une valeur décimale trahit une source corrompue. */
function asEntier(value: unknown): number | null {
  const nombre = asNumber(value);
  return nombre !== null && Number.isInteger(nombre) ? nombre : null;
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
 * plutôt que d'afficher un trou dans la tuile. Une action qu'on ne peut pas
 * ouvrir d'un clic (pas d'URL) ne sert à rien ; si regles.mjs cesse un jour
 * de la fournir, ce filtre doit vider la liste plutôt que deviner une URL. */
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
      fenetre: asFenetre(record.fenetre),
    });
  }
  // Priorité croissante = plus urgent d'abord (convention regles.mjs) ; une
  // priorité absente ne veut pas dire « urgente », elle va en fin de liste
  // plutôt que de se retrouver en tête par accident de tri. Tri stable :
  // l'ordre du producteur départage les ex æquo.
  return actions
    .map((action, indexOrigine) => ({ action, indexOrigine }))
    .sort((a, b) => {
      if (a.action.priorite === null && b.action.priorite === null) {
        return a.indexOrigine - b.indexOrigine;
      }
      if (a.action.priorite === null) return 1;
      if (b.action.priorite === null) return -1;
      return a.action.priorite - b.action.priorite || a.indexOrigine - b.indexOrigine;
    })
    .map(({ action }) => action);
}

/** Un bloc GSC « ok » sans la moindre mesure numérique est un payload
 * suspect (schéma déformé, ligne vide) : « aucune action cette semaine »
 * ne doit se dire que si au moins une mesure atteste que Search Console a
 * effectivement répondu quelque chose d'exploitable. Sinon, indisponible,
 * même quand le statut dit « ok ». Partagée par la tuile et la page pour
 * ne pas dupliquer ce jugement à deux endroits. */
export function gscMesurePresente(donnees: GscDonnees): boolean {
  return (
    donnees.totaux.clics !== null ||
    donnees.totaux.impressions !== null ||
    donnees.totaux.ctr !== null ||
    donnees.totaux.position !== null ||
    donnees.clicsBelgique !== null ||
    donnees.clicsBelgiquePrecedents !== null
  );
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

/** Distingue un champ absent ou du mauvais type (donnée manquante, `null`)
 * d'un tableau présent mais vide (zéro constaté, `[]`) : COALESCE(..., '[]')
 * côté SQL rend `[]` faute de ligne correspondante, ce qui est une mesure,
 * pas une absence de mesure. Les deux ne doivent jamais se confondre. */
function asVisitesIa(value: unknown): VisiteIa[] | null {
  if (!Array.isArray(value)) return null;
  const visites: VisiteIa[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const source = asString(record.source);
    if (source === null) continue;
    visites.push({ source, visites: asNumber(record.visites) });
  }
  return visites;
}

/** La règle « page qui reçoit du trafic d'assistants et n'a pas bougé depuis
 * 90 jours » dépend de cette liste : un chemin manquant rend la ligne
 * inexploitable (écartée), mais des visites non numériques n'invalident que
 * ce champ (rendu null), pas la ligne entière. */
function asPagesEntree(value: unknown): PageEntree[] {
  if (!Array.isArray(value)) return [];
  const pages: PageEntree[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const chemin = asString(record.chemin);
    if (chemin === null) continue; // pas de chemin, pas de ligne exploitable
    pages.push({
      chemin,
      visites: asNumber(record.visites),
      visitesIa: asNumber(record.visitesIa),
    });
  }
  return pages;
}

function asUmamiDonnees(value: unknown): UmamiDonnees {
  const record = asRecord(value);
  return {
    visites: asNumber(record.visites),
    visitesIa: asVisitesIa(record.visitesIa),
    pagesEntree: asPagesEntree(record.pagesEntree),
    profondeur: asNumber(record.profondeur),
    evenements: asEntier(record.evenements),
  };
}

/** Même distinction que asVisitesIa : absent ou du mauvais type → null
 * (donnée manquante) ; tableau présent, même vide → [] (zéro constaté). */
/** Filtre au passage : une entrée qui n'est pas une chaîne (hreflang
 * corrompu) est écartée plutôt que de planter tout le tableau. */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function asPagesCrawl(value: unknown): PageCrawl[] | null {
  if (!Array.isArray(value)) return null;
  const pages: PageCrawl[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const url = asString(record.url);
    if (url === null) continue;
    pages.push({
      url,
      statut: asNumber(record.statut),
      canonical: asString(record.canonical),
      titre: asString(record.titre),
      description: asString(record.description),
      hreflang: asStringArray(record.hreflang),
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
  return {
    status,
    message: null,
    generatedAt: null,
    scriptSha256: null,
    fenetre: null,
    donnees: null,
  };
}

function estStatutConnu(value: unknown): value is StatutConnu {
  return (
    typeof value === 'string' &&
    (STATUTS_CONNUS as readonly string[]).includes(value)
  );
}

function parseBloc<T>(
  raw: unknown,
  nomAttendu: NomBloc,
  parseurDonnees: (v: unknown) => T,
): Bloc<T> {
  if (raw === null || typeof raw !== 'object') return blocIllisible('format-inconnu');
  const record = raw as Record<string, unknown>;

  // Contrat JSON commun, version 1 (contraintes-globales.md). Toute autre
  // version est un format qu'on ne sait pas encore lire : mieux vaut
  // l'afficher illisible que de deviner une correspondance de champs fausse.
  if (record.schemaVersion !== SCHEMA_VERSION) return blocIllisible('format-inconnu');

  // Le champ `bloc` doit correspondre au fichier lu (seo-gsc.json porte
  // bloc: "gsc", etc.) : un contenu mélangé ou un fichier tronqué au mauvais
  // endroit ne doit jamais être lu comme s'il portait les bons chiffres.
  if (record.bloc !== nomAttendu) return blocIllisible('format-inconnu');

  if (!estStatutConnu(record.status)) return blocIllisible('format-inconnu');

  const generatedAt = asString(record.generatedAt);
  const message = asString(record.message);
  const scriptSha256 = asString(record.scriptSha256);
  // Fenêtre d'analyse au premier niveau du contrat commun : décrit la
  // période visée par le relevé, pas son succès. On la lit même quand le
  // bloc est en panne ou bloqué (la sonde sait quelle fenêtre elle visait
  // avant d'échouer), jamais quand le format lui-même est illisible.
  const fenetre = asFenetre(record.fenetre);
  // error/blocked n'ont jamais de donnees exploitables dans le contrat (le
  // crawl bloqué par Cloudflare écrit `donnees: null`) : on ne tente même
  // pas de les parser, ce qui évite tout plantage sur un null inattendu.
  const donnees = record.status === 'ok' ? parseurDonnees(record.donnees) : null;

  return { status: record.status, message, generatedAt, scriptSha256, fenetre, donnees };
}

async function lireBloc<T>(
  nom: NomBloc,
  dir: string,
  parseurDonnees: (v: unknown) => T,
): Promise<Bloc<T>> {
  try {
    const contenu = await readFile(join(dir, `seo-${nom}.json`), 'utf8');
    return parseBloc(JSON.parse(contenu), nom, parseurDonnees);
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
