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

// Version acceptée du contrat commun, PAR BLOC : Search Console est monté en
// version 3 (publieRecemment devient { liste, total } après le premier
// passage sur données réelles), Umami en version 2 (referents,
// visitesParChemin), le passage technique reste en version 1, non touché.
// Trois valeurs différentes, chacune pour son bloc : un fichier resté à
// l'ancienne version pour un bloc monté depuis (script pas encore
// redéployé) doit se lire illisible, jamais deviné compatible.
//
// Lot 1 de la refonte (spec bgm-ops 2026-11-09, section 11) : GSC 4 et
// Umami 3 sont ADDITIFS (nouveaux champs, requêtes filtrées Belgique en GSC
// 4). Ce module accepte l'ancienne et la nouvelle version de chaque bloc,
// pour pouvoir être déployé AVANT la collecte : sinon, entre l'installation
// de la collecte et le déploiement de la page, le bloc s'afficherait « format
// non reconnu ». Toute autre version reste illisible.
const SCHEMA_VERSIONS = {
  gsc: [3, 4],
  umami: [2, 3],
  crawl: [1],
} as const satisfies Record<NomBloc, readonly number[]>;

// Le relevé tourne chaque jour à 06:30 UTC (bgm-ops, bgm-seo-report.timer) :
// passé deux passages manqués, ça doit se voir. 50 h et non 48, pour ne pas
// rougir pendant les quelques minutes que dure le passage lui-même.
const STALE_AFTER_HOURS = 50;

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

/** « Ce que vous avez publié » (contrat v3, bloc-gsc.mjs). `clics` et
 * `impressions` à zéro sont de vrais zéros constatés (une page publiée qui
 * n'a rien reçu) : ils s'affichent tels quels, comme n'importe quel compte
 * de ce module. Seul `visitesUmami` peut valoir `null` : cela signifie que
 * le bloc Umami était en panne cette semaine-là, pas que la page n'a reçu
 * aucune visite. `datePublication` est un jour calendaire (« 2026-09-18 »),
 * sans horodatage. */
export interface PagePubliee {
  chemin: string;
  datePublication: string | null;
  clics: number | null;
  impressions: number | null;
  visitesUmami: number | null;
}

/** `liste` : au plus 15 entrées côté producteur, les pages n'ayant rien reçu
 * (zéro clic, zéro visite) en tête, le reste par date de publication
 * décroissante — c'est l'ordre voulu, ce module ne re-trie ni ne tronque, il
 * valide. `total` est le nombre RÉEL de pages publiées dans la fenêtre (peut
 * dépasser 15) : ne jamais le déduire de la longueur de `liste`, qui est
 * plafonnée. */
export interface PublieRecemment {
  liste: PagePubliee[];
  total: number | null;
}

/** Une requête sur laquelle le site apparaît désormais dans les résultats
 * (impressions en hausse) sans qu'aucun clic ne soit garanti : le site peut
 * être classé au-delà de la première page de résultats, vu mais pas encore
 * lu. */
export interface RequeteEmergente {
  requete: string;
  impressions: number | null;
  impressionsPrecedentes: number | null;
  position: number | null;
  /** Page que Google montre pour cette requête (celle qui a reçu le plus
   * d'impressions), ou null : absente des rapports d'avant le 28/09/2026,
   * ou adresse hors du site, écartée plutôt que liée. */
  page: string | null;
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

/** Une journée de clics depuis la Belgique (GSC 4). Un jour sans donnée est
 * absent de la liste côté producteur, jamais inventé à zéro. */
export interface JourClics {
  date: string;
  clics: number | null;
  impressions: number | null;
}

/** Clics depuis la Belgique regroupés par langue du chemin (GSC 4). */
export interface LangueClics {
  langue: string;
  clics: number | null;
  impressions: number | null;
  clicsPrecedents: number | null;
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
  publieRecemment: PublieRecemment;
  // Au plus 5 entrées côté producteur : ce module ne re-trie ni ne
  // tronque, il valide.
  requetesEmergentes: RequeteEmergente[];
  // GSC 4 et suivantes. `null` = champ absent (fichier en version 3, ou
  // donnée non transmise), jamais un tableau ou des totaux inventés.
  totauxBelgique: Totaux | null;
  totauxBelgiquePrecedents: Totaux | null;
  clicsBelgiqueParJour: JourClics[] | null;
  clicsBelgiqueParJourPrecedent: JourClics[] | null;
  parLangue: LangueClics[] | null;
  // Vrai à partir de GSC 4 : requêtes, requêtes émergentes et part des
  // requêtes sont filtrées Belgique. En version 3, elles comptent le monde
  // entier, et l'affichage doit le dire.
  requetesBelgique: boolean;
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

/** Forme commune aux quatre listes de `referents` (contrat v2) : une source
 * de trafic (site référent, moteur, canal fermé, campagne) et son compte de
 * visites. */
export interface SourceVisites {
  source: string;
  visites: number | null;
}

export interface MoteursHorsGoogle {
  // Au plus 10 entrées côté producteur : ce module ne re-trie ni ne
  // tronque, il valide.
  liste: SourceVisites[];
  // Le total réel des moteurs hors Google, PAS la somme de `liste` (qui est
  // plafonnée à 10) : les deux ne coïncident pas dès qu'un onzième moteur
  // existe. Ne jamais recalculer ce total à partir de la liste.
  total: number | null;
}

/** « Qui envoie des lecteurs » (contrat v2, bloc-umami.mjs). `null` = la
 * mesure entière est absente (query en panne, ou version antérieure du
 * relevé) ; un objet présent dont une sous-liste vaut `[]` est une mesure
 * réussie qui n'a trouvé aucune ligne (zéro constaté). Les deux ne sont
 * jamais confondus : `referents: null` ne dit rien, `referents.sansReferent`
 * dit quelque chose même quand il vaut 0. */
export interface Referents {
  moteursHorsGoogle: MoteursHorsGoogle;
  canauxFermes: SourceVisites[];
  sitesReferents: SourceVisites[];
  campagnes: SourceVisites[];
  // Jamais une liste : le nombre de visites sans le moindre référent HTTP
  // (accès direct, favori, application). Domine presque toujours les listes
  // ci-dessus, qui comptent donc pour moins qu'elles n'en ont l'air.
  sansReferent: number | null;
}

export interface CheminVisite {
  chemin: string;
  visites: number | null;
}

/** Un événement Umami nommé (Umami 3). */
export interface EvenementNomme {
  nom: string;
  total: number | null;
  visites: number | null;
}

/** Événement `inscription-reussie` (Umami 3). Il est aussi envoyé à une
 * personne déjà abonnée qui se réinscrit : ce n'est pas un compte de
 * nouveaux abonnés. */
export interface Inscriptions {
  total: number | null;
  visites: number | null;
  parPageEntree: CheminVisite[];
}

export interface LangueVisites {
  langue: string;
  visites: number | null;
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
  referents: Referents | null;
  // Sans plafond, à usage interne (pas affiché tel quel sur la page) : ce
  // module ne re-trie ni ne tronque, il valide.
  visitesParChemin: CheminVisite[];
  // Umami 3 et suivantes. `null` = champ absent ou colonne `event_name`
  // introuvable côté base (la collecte le vérifie à l'exécution) : jamais
  // une liste vide inventée.
  evenementsParNom: EvenementNomme[] | null;
  inscriptions: Inscriptions | null;
  visitesParLangue: LangueVisites[] | null;
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
  // Version du contrat lue dans le fichier, null quand le fichier est
  // illisible ou absent. Optionnelle dans le type pour ne pas imposer le
  // champ aux constructions de test ; toujours renseignée par la lecture.
  schemaVersion?: number | null;
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

/** Une semaine de la série reconstruite depuis l'historique (lot 2, spec
 * bgm-ops section 13). Chaque point couvre 28 jours glissants : deux points
 * successifs se recouvrent à 75 %. `null` = bloc pas « ok » cette semaine-là
 * ou champ absent de sa version, jamais un zéro. */
export interface SemaineSerie {
  semaine: string;
  gsc: {
    fin: string | null;
    clicsBelgique: number | null;
    clicsBelgiquePrecedents: number | null;
    clicsMonde: number | null;
    impressionsBelgique: number | null;
  };
  umami: {
    fin: string | null;
    visites: number | null;
    visitesIa: number | null;
    inscriptions: number | null;
    sansReferent: number | null;
  };
}

export interface RapportSeo {
  // Série hebdomadaire (seo-serie.json). Optionnelle dans le type pour les
  // constructions de test ; `null` quand le fichier est absent ou illisible
  // (collecte du lot 2 pas encore installée), jamais une série vide inventée.
  serie?: SemaineSerie[] | null;
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
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
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
  return nombre !== null && Number.isInteger(nombre) && nombre >= 0 ? nombre : null;
}

/** Un compte (clics, impressions, visites…) n'est jamais négatif : une
 * valeur négative ne peut signifier qu'une corruption, jamais un « moins
 * cinquante clics » réel — traitée comme NaN, donnée absente. Aucune borne
 * haute : un chiffre énorme mais positif reste surprenant, pas impossible,
 * et s'affiche tel quel (c'est le sens même de ce rapport). */
function asCompte(value: unknown): number | null {
  const nombre = asNumber(value);
  return nombre !== null && nombre >= 0 ? nombre : null;
}

/** Une position de classement commence à 1 et n'est jamais négative ; au-delà,
 * toute valeur positive reste plausible (un site mal classé peut apparaître
 * très loin), donc non bornée en haut. */
function asPosition(value: unknown): number | null {
  const nombre = asNumber(value);
  return nombre !== null && nombre >= 0 ? nombre : null;
}

/** Une fraction représentant un pourcentage (CTR, profondeur, part des
 * requêtes) est bornée à [0, 1] par définition : au-delà, ce n'est plus un
 * pourcentage mesuré, c'est une corruption. Un pourcentage inhabituel mais
 * plausible (99 %) reste affiché tel quel : seule l'impossibilité borne. */
function asFractionPourcentage(value: unknown): number | null {
  const nombre = asNumber(value);
  return nombre !== null && nombre >= 0 && nombre <= 1 ? nombre : null;
}

function asTotaux(value: unknown): Totaux {
  const record = asRecord(value);
  return {
    clics: asCompte(record.clics),
    impressions: asCompte(record.impressions),
    ctr: asFractionPourcentage(record.ctr),
    position: asPosition(record.position),
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
      clics: asCompte(record.clics),
      impressions: asCompte(record.impressions),
      ctr: asFractionPourcentage(record.ctr),
      position: asPosition(record.position),
      clicsPrecedents: asCompte(record.clicsPrecedents),
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
      clics: asCompte(record.clics),
      impressions: asCompte(record.impressions),
      position: asPosition(record.position),
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
      impressions: asCompte(record.impressions),
      position: asPosition(record.position),
      ctr: asFractionPourcentage(record.ctr),
      ctrMedianBande: asFractionPourcentage(record.ctrMedianBande),
      bande: asString(record.bande),
    });
  }
  return opportunites;
}

/** Une page sans chemin n'est pas exploitable (pas de lien à afficher) : on
 * l'écarte plutôt que d'afficher un trou dans la liste. `clics` et
 * `impressions` utilisent asCompte (0 est une valeur valide, distincte de
 * `null`) : c'est exactement ce qui distingue un zéro constaté d'une donnée
 * absente. */
function asPagesPubliees(value: unknown): PagePubliee[] {
  if (!Array.isArray(value)) return [];
  const pages: PagePubliee[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const chemin = asString(record.chemin);
    if (chemin === null) continue;
    pages.push({
      chemin,
      datePublication: asString(record.datePublication),
      clics: asCompte(record.clics),
      impressions: asCompte(record.impressions),
      visitesUmami: asCompte(record.visitesUmami),
    });
  }
  return pages;
}

/** `{ liste, total }`, jamais un tableau brut (forme réelle depuis le
 * premier passage sur données réelles : 144 pages publiées dans la fenêtre
 * rendaient un tableau brut illisible sur téléphone). `total` n'est JAMAIS
 * déduit de la longueur de `liste`, qui est plafonnée à 15 côté producteur :
 * les deux peuvent légitimement diverger. */
function asPublieRecemment(value: unknown): PublieRecemment {
  const record = asRecord(value);
  return {
    liste: asPagesPubliees(record.liste),
    total: asCompte(record.total),
  };
}

/** Une requête émergente sans texte de requête n'est pas exploitable
 * (rien à afficher ni à chercher) : on l'écarte plutôt que d'afficher une
 * ligne vide. */
function asRequetesEmergentes(value: unknown): RequeteEmergente[] {
  if (!Array.isArray(value)) return [];
  const requetes: RequeteEmergente[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const requete = asString(record.requete);
    if (requete === null) continue;
    requetes.push({
      requete,
      impressions: asCompte(record.impressions),
      impressionsPrecedentes: asCompte(record.impressionsPrecedentes),
      position: asPosition(record.position),
      page: asPageDuSite(record.page),
    });
  }
  return requetes;
}

/** Seule une adresse du site devient un lien dans l'administration. */
function asPageDuSite(value: unknown): string | null {
  const url = asString(value);
  return url !== null && url.startsWith('https://governance.brussels/') ? url : null;
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

function asTotauxOptionnels(value: unknown): Totaux | null {
  return value === null || typeof value !== 'object' ? null : asTotaux(value);
}

function asJoursClics(value: unknown): JourClics[] | null {
  if (!Array.isArray(value)) return null;
  const jours: JourClics[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const date = asString(record.date);
    if (date === null || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    jours.push({ date, clics: asCompte(record.clics), impressions: asCompte(record.impressions) });
  }
  return jours;
}

function asParLangue(value: unknown): LangueClics[] | null {
  if (!Array.isArray(value)) return null;
  const langues: LangueClics[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const langue = asString(record.langue);
    if (langue === null) continue;
    langues.push({
      langue,
      clics: asCompte(record.clics),
      impressions: asCompte(record.impressions),
      clicsPrecedents: asCompte(record.clicsPrecedents),
    });
  }
  return langues;
}

function asGscDonnees(value: unknown, version: number): GscDonnees {
  const record = asRecord(value);
  return {
    totaux: asTotaux(record.totaux),
    totauxPrecedents: asTotaux(record.totauxPrecedents),
    clicsBelgique: asCompte(record.clicsBelgique),
    clicsBelgiquePrecedents: asCompte(record.clicsBelgiquePrecedents),
    fenetre: asFenetre(record.fenetre),
    pages: asPagesGsc(record.pages),
    requetes: asRequetes(record.requetes),
    partRequetes: asFractionPourcentage(record.partRequetes),
    opportunitesTitre: asOpportunitesTitre(record.opportunitesTitre),
    actions: asActions(record.actions),
    publieRecemment: asPublieRecemment(record.publieRecemment),
    requetesEmergentes: asRequetesEmergentes(record.requetesEmergentes),
    totauxBelgique: asTotauxOptionnels(record.totauxBelgique),
    totauxBelgiquePrecedents: asTotauxOptionnels(record.totauxBelgiquePrecedents),
    clicsBelgiqueParJour: asJoursClics(record.clicsBelgiqueParJour),
    clicsBelgiqueParJourPrecedent: asJoursClics(record.clicsBelgiqueParJourPrecedent),
    parLangue: asParLangue(record.parLangue),
    requetesBelgique: version >= 4,
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
    visites.push({ source, visites: asCompte(record.visites) });
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
      visites: asCompte(record.visites),
      visitesIa: asCompte(record.visitesIa),
    });
  }
  return pages;
}

/** Une entrée sans source n'est pas exploitable (rien à nommer dans la
 * liste) : on l'écarte plutôt que d'afficher une ligne vide. */
function asSourceVisites(value: unknown): SourceVisites | null {
  const record = asRecord(value);
  const source = asString(record.source);
  if (source === null) return null;
  return { source, visites: asCompte(record.visites) };
}

/** Au plus 10 entrées côté producteur (contrat v2) : ce module ne re-trie
 * ni ne tronque, il valide, comme pagesEntree et les autres listes du
 * contrat commun. */
function asListeSources(value: unknown): SourceVisites[] {
  if (!Array.isArray(value)) return [];
  const items: SourceVisites[] = [];
  for (const ligne of value) {
    const entree = asSourceVisites(ligne);
    if (entree) items.push(entree);
  }
  return items;
}

function asMoteursHorsGoogle(value: unknown): MoteursHorsGoogle {
  const record = asRecord(value);
  return {
    liste: asListeSources(record.liste),
    // Ne JAMAIS recalculer ce total à partir de `liste`, qui est plafonnée
    // à 10 : le total réel peut porter sur davantage de moteurs.
    total: asCompte(record.total),
  };
}

/** `null` = la mesure `referents` entière est absente ou du mauvais type
 * (champ manquant, version antérieure du relevé) : donnée manquante. Un
 * objet présent, même aux sous-listes vides, est une mesure réussie qui n'a
 * trouvé aucune ligne pour cette sous-liste (zéro constaté). Les deux ne
 * sont jamais confondus. */
function asReferents(value: unknown): Referents | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return {
    moteursHorsGoogle: asMoteursHorsGoogle(record.moteursHorsGoogle),
    canauxFermes: asListeSources(record.canauxFermes),
    sitesReferents: asListeSources(record.sitesReferents),
    campagnes: asListeSources(record.campagnes),
    sansReferent: asCompte(record.sansReferent),
  };
}

/** Sans plafond côté producteur, à usage interne : une entrée sans chemin
 * n'est pas exploitable, on l'écarte. */
function asVisitesParChemin(value: unknown): CheminVisite[] {
  if (!Array.isArray(value)) return [];
  const items: CheminVisite[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const chemin = asString(record.chemin);
    if (chemin === null) continue;
    items.push({ chemin, visites: asCompte(record.visites) });
  }
  return items;
}

function asEvenementsParNom(value: unknown): EvenementNomme[] | null {
  if (!Array.isArray(value)) return null;
  const items: EvenementNomme[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const nom = asString(record.nom);
    if (nom === null) continue;
    items.push({ nom, total: asCompte(record.total), visites: asCompte(record.visites) });
  }
  return items;
}

function asInscriptions(value: unknown): Inscriptions | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    total: asCompte(record.total),
    visites: asCompte(record.visites),
    parPageEntree: asVisitesParChemin(record.parPageEntree),
  };
}

function asVisitesParLangue(value: unknown): LangueVisites[] | null {
  if (!Array.isArray(value)) return null;
  const items: LangueVisites[] = [];
  for (const ligne of value) {
    const record = asRecord(ligne);
    const langue = asString(record.langue);
    if (langue === null) continue;
    items.push({ langue, visites: asCompte(record.visites) });
  }
  return items;
}

function asUmamiDonnees(value: unknown): UmamiDonnees {
  const record = asRecord(value);
  return {
    visites: asCompte(record.visites),
    visitesIa: asVisitesIa(record.visitesIa),
    pagesEntree: asPagesEntree(record.pagesEntree),
    profondeur: asFractionPourcentage(record.profondeur),
    evenements: asEntier(record.evenements),
    referents: asReferents(record.referents),
    visitesParChemin: asVisitesParChemin(record.visitesParChemin),
    evenementsParNom: asEvenementsParNom(record.evenementsParNom),
    inscriptions: asInscriptions(record.inscriptions),
    visitesParLangue: asVisitesParLangue(record.visitesParLangue),
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

/** Pages effectivement cassées : un statut CONNU et différent de 200,
 * jamais une page au statut inconnu (`null`) — celle-ci n'est pas prouvée
 * cassée, juste non contrôlée. Confondre les deux range parmi les pages
 * cassées celles dont on ne sait rien. Partagée par la tuile (le compte
 * d'alertes) et la page (la table « Pages sans statut 200 ») pour que les
 * deux affichages s'accordent toujours sur le même chiffre. */
export function pagesCassees(pages: PageCrawl[]): PageCrawl[] {
  return pages.filter((p) => p.statut !== null && p.statut !== 200);
}

function asCrawlDonnees(value: unknown): CrawlDonnees {
  const record = asRecord(value);
  return {
    pages: asPagesCrawl(record.pages),
    bloquees: asCompte(record.bloquees),
    echecs: asCompte(record.echecs),
  };
}

const PARSEURS_DONNEES = {
  gsc: asGscDonnees,
  umami: asUmamiDonnees,
  crawl: asCrawlDonnees,
} satisfies Record<NomBloc, (v: unknown, version: number) => unknown>;

// --- Enveloppe commune -------------------------------------------------

function blocIllisible<T>(status: StatutBloc): Bloc<T> {
  return {
    status,
    schemaVersion: null,
    message: null,
    generatedAt: null,
    scriptSha256: null,
    fenetre: null,
    donnees: null,
  };
}

/** La SQL d'Umami (bgm-ops, deploy/seo-report/bloc-umami.sql) écrit la fin
 * de fenêtre comme une borne EXCLUSIVE : `$FIN + 1 jour` à minuit UTC, soit
 * `2026-11-08T00:00:00Z` pour une fenêtre qui s'arrête le 7 novembre inclus.
 * Partout ici, une fenêtre est une plage de jours INCLUSIVE (Search Console
 * écrit `2026-11-07`). Lue telle quelle, la fin Umami ajoutait un jour
 * (« 29 jours… au 8 novembre ») et faisait croire chaque jour que les deux
 * fenêtres ne coïncidaient pas, alors qu'elles couvraient les mêmes dates
 * (constaté en production le 09/11/2026). On ramène donc une fin à minuit
 * pile au jour précédent, en date seule. Une fin écrite autrement (date
 * seule, ou heure non nulle) est laissée telle quelle : si la collecte passe
 * un jour à une fin inclusive, cette normalisation devient sans effet au lieu
 * de retirer un jour à tort. */
export function normaliserFinExclusive(fenetre: FenetreRapport | null): FenetreRapport | null {
  if (!fenetre?.fin) return fenetre;
  const m = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.0+)?Z$/.exec(fenetre.fin);
  if (!m) return fenetre;
  const veille = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - 1));
  return { ...fenetre, fin: veille.toISOString().slice(0, 10) };
}

function estStatutConnu(value: unknown): value is StatutConnu {
  return typeof value === 'string' && (STATUTS_CONNUS as readonly string[]).includes(value);
}

function parseBloc<T>(
  raw: unknown,
  nomAttendu: NomBloc,
  parseurDonnees: (v: unknown, version: number) => T,
): Bloc<T> {
  if (raw === null || typeof raw !== 'object') return blocIllisible('format-inconnu');
  const record = raw as Record<string, unknown>;

  // Contrat JSON commun (contraintes-globales.md), version attendue PAR
  // BLOC (voir SCHEMA_VERSIONS). Toute autre version, y compris une
  // ancienne version pour un bloc monté depuis, est un format qu'on ne sait
  // pas encore lire : mieux vaut l'afficher illisible que de deviner une
  // correspondance de champs fausse.
  const version = record.schemaVersion;
  if (
    typeof version !== 'number' ||
    !(SCHEMA_VERSIONS[nomAttendu] as readonly number[]).includes(version)
  ) {
    return blocIllisible('format-inconnu');
  }

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
  const fenetreBrute = asFenetre(record.fenetre);
  const fenetre = nomAttendu === 'umami' ? normaliserFinExclusive(fenetreBrute) : fenetreBrute;
  // error/blocked n'ont jamais de donnees exploitables dans le contrat (le
  // crawl bloqué par Cloudflare écrit `donnees: null`) : on ne tente même
  // pas de les parser, ce qui évite tout plantage sur un null inattendu.
  const donnees = record.status === 'ok' ? parseurDonnees(record.donnees, version) : null;

  return {
    status: record.status,
    schemaVersion: version,
    message,
    generatedAt,
    scriptSha256,
    fenetre,
    donnees,
  };
}

const SERIE_SCHEMA_VERSION = 1;

function blocSerieValide(value: unknown): boolean {
  return value !== null && typeof value === 'object' && (value as Record<string, unknown>).status === 'ok';
}

/** Lecture défensive de seo-serie.json : une semaine illisible est écartée,
 * un bloc qui n'est pas « ok » donne des valeurs null (jamais des zéros). */
export function parseSerie(raw: unknown): SemaineSerie[] | null {
  if (raw === null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== SERIE_SCHEMA_VERSION || !Array.isArray(record.semaines)) return null;
  const semaines: SemaineSerie[] = [];
  for (const ligne of record.semaines) {
    const r = asRecord(ligne);
    const semaine = asString(r.semaine);
    if (semaine === null || !/^\d{4}-W\d{2}$/.test(semaine)) continue;
    const gscOk = blocSerieValide(r.gsc);
    const umamiOk = blocSerieValide(r.umami);
    const g = asRecord(r.gsc);
    const u = asRecord(r.umami);
    semaines.push({
      semaine,
      gsc: {
        fin: gscOk ? asString(g.fin) : null,
        clicsBelgique: gscOk ? asCompte(g.clicsBelgique) : null,
        clicsBelgiquePrecedents: gscOk ? asCompte(g.clicsBelgiquePrecedents) : null,
        clicsMonde: gscOk ? asCompte(g.clicsMonde) : null,
        impressionsBelgique: gscOk ? asCompte(g.impressionsBelgique) : null,
      },
      umami: {
        fin: umamiOk
          ? (normaliserFinExclusive({ debut: null, fin: asString(u.fin), fuseau: 'UTC' })?.fin ?? null)
          : null,
        visites: umamiOk ? asCompte(u.visites) : null,
        visitesIa: umamiOk ? asCompte(u.visitesIa) : null,
        inscriptions: umamiOk ? asCompte(u.inscriptions) : null,
        sansReferent: umamiOk ? asCompte(u.sansReferent) : null,
      },
    });
  }
  semaines.sort((a, b) => a.semaine.localeCompare(b.semaine));
  // Un même relevé peut avoir été archivé sous deux semaines (constaté le
  // 09/11/2026 : 2026-W38 et 2026-W39 portaient le relevé arrêté au 18/09,
  // chiffres identiques). Le compter deux fois dessinerait un plateau là où
  // il n'y a aucune donnée nouvelle : on ne garde que la première semaine
  // d'un relevé dont les deux fins de fenêtre sont identiques à celles de la
  // semaine précédente. Une fin inconnue ne prouve rien : jamais dédoublonnée.
  return semaines.filter((s, i) => {
    const p = semaines[i - 1];
    if (!p || s.gsc.fin === null || s.umami.fin === null) return true;
    return !(s.gsc.fin === p.gsc.fin && s.umami.fin === p.umami.fin);
  });
}

async function lireSerie(dir: string): Promise<SemaineSerie[] | null> {
  try {
    return parseSerie(JSON.parse(await readFile(join(dir, 'seo-serie.json'), 'utf8')));
  } catch {
    return null;
  }
}

async function lireBloc<T>(
  nom: NomBloc,
  dir: string,
  parseurDonnees: (v: unknown, version: number) => T,
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
      serie: null,
      blocs: {
        gsc: blocIllisible('absent'),
        umami: blocIllisible('absent'),
        crawl: blocIllisible('absent'),
      },
      fraicheur: { gsc: null, umami: null, crawl: null },
    };
  }

  const dir = join(dirname(dbPath), 'seo-report');
  const [gsc, umami, crawl, serie] = await Promise.all([
    lireBloc('gsc', dir, PARSEURS_DONNEES.gsc),
    lireBloc('umami', dir, PARSEURS_DONNEES.umami),
    lireBloc('crawl', dir, PARSEURS_DONNEES.crawl),
    lireSerie(dir),
  ]);

  return {
    serie,
    blocs: { gsc, umami, crawl },
    fraicheur: {
      gsc: describeFreshness(gsc.generatedAt, { staleAfterHours: STALE_AFTER_HOURS }),
      umami: describeFreshness(umami.generatedAt, { staleAfterHours: STALE_AFTER_HOURS }),
      crawl: describeFreshness(crawl.generatedAt, { staleAfterHours: STALE_AFTER_HOURS }),
    },
  };
}
