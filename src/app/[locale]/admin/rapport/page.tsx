// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/require-admin';
import {
  readSeoReport,
  gscMesurePresente,
  pagesCassees,
  type Bloc,
  type CrawlDonnees,
  type FenetreRapport,
  type GscDonnees,
  type PageCrawl,
  type PageGsc,
  type PagePubliee,
  type RapportSeo,
  type SemaineSerie,
  type SourceVisites,
  type StatutBloc,
  type UmamiDonnees,
  type VisiteIa,
} from '@/lib/seo-report';
import { type Freshness } from '@/lib/snapshot-freshness';
import { verdictRapport } from '@/lib/rapport-verdict';
import { chemin } from '@/lib/utils';
import { getNombreDePages } from '@/lib/site-stats';
import { ClicsBelgiqueParJourChart } from '@/components/admin/clics-belgique-par-jour-chart';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admin — Audience et santé du site',
    robots: { index: false, follow: false },
  };
}

// « sonde réussie » et non « à jour » : ok veut dire que la requête a
// réussi, pas que la donnée est fraîche. Confondre les deux affichait
// « État : à jour » sur un relevé vieux de dix jours.
const LIBELLES_STATUT: Record<StatutBloc, string> = {
  ok: 'sonde réussie',
  error: 'en panne',
  blocked: 'bloqué',
  absent: 'aucun relevé',
  'format-inconnu': 'format non reconnu',
};

const NOMS_BLOCS: Record<keyof RapportSeo['blocs'], string> = {
  gsc: 'Search Console',
  umami: 'Umami',
  crawl: 'Crawl technique',
};

// Une seule empreinte couvre toute la collecte : bgm-seo-report.sh (bgm-ops)
// hache, dans cet ordre, le script lui-même, seo-report/main.mjs, puis le
// reste de seo-report/ trié par nom en locale C, et écrit la même valeur dans
// les trois fichiers. La commande ci-dessous reproduit ce calcul depuis une
// copie de bgm-ops ; l'ancienne invite (« sha256sum bloc-XXX.mjs ») ne
// pouvait jamais tomber juste. Attention : jusqu'au lot 1 de la collecte,
// seul `ls` était en locale C et `sort` suivait celle du serveur (UTF-8, qui
// ignore la ponctuation) ; l'empreinte du serveur n'égale cette commande
// qu'une fois le script corrigé installé (constat du 09/11/2026 : fichiers du
// serveur identiques au dépôt, seul l'ordre différait).
const COMMANDE_EMPREINTE =
  "cd bgm-ops/deploy && cat bgm-seo-report.sh seo-report/main.mjs $(ls -1 seo-report | LC_ALL=C sort | grep -vx main.mjs | sed 's|^|seo-report/|') | sha256sum";

// Seuil de couverture du passage technique, rapporté au nombre réel d'URL du
// plan du site (sitemap.ts), et non plus à une constante écrite en dur (630
// le 19/09, 708 pages en novembre).
const COUVERTURE_MINIMALE = 0.5;

// Une page modifiée il y a moins de sept jours (date du plan du site) n'a
// pas encore de chiffres interprétables : Search Console publie avec deux à
// trois jours de retard, et l'indexation d'une page neuve prend souvent plus.
// Son zéro est mécanique, pas un signal : elle n'est pas listée, seulement
// comptée.
const JOURS_AVANT_JUGEMENT = 7;

// --- Formatage : français, nombres à la belge, jamais de zéro inventé -----

function formatNombre(n: number | null): string {
  return n === null ? 'indisponible' : n.toLocaleString('fr-BE');
}

function formatDecimal(n: number | null, decimales = 1): string {
  return n === null
    ? 'indisponible'
    : n.toLocaleString('fr-BE', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      });
}

/** Search Console rend ctr et partRequetes en fraction (0 à 1), comme
 * l'API Google : on affiche le pourcentage, jamais la fraction brute. */
function formatPourcentFraction(fraction: number | null): string {
  return fraction === null ? 'indisponible' : `${formatDecimal(fraction * 100, 1)} %`;
}

/** Toute l'administration lit l'heure de Bruxelles (content/published.tsx,
 * digest, etc.) : le rapport SEO était le seul coin resté en UTC. */
function formatHoraire(iso: string | null): string {
  if (!iso) return 'indisponible';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 'date illisible';
  return new Date(parsed).toLocaleString('fr-BE', {
    timeZone: 'Europe/Brussels',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Lit uniquement le jour calendaire de l'ISO (YYYY-MM-DD…), sans passer par
 * un fuseau : une fenêtre est une plage de jours dans le fuseau DE SA
 * SOURCE (Pacifique pour Search Console, UTC pour Umami), pas un instant à
 * reconvertir vers Bruxelles — ce qui décalerait le jour affiché. */
function formatDateSeule(iso: string | null): string {
  if (!iso) return 'indisponible';
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!correspondance) return 'date illisible';
  const [, annee, mois, jour] = correspondance;
  return `${jour}/${mois}/${annee}`;
}

/** Nomme le fuseau en clair plutôt que l'identifiant IANA brut, et rappelle
 * quel bloc l'utilise : c'est justement parce que Search Console (Pacifique)
 * et Umami (UTC) diffèrent qu'un chiffre de l'un ne se rapproche pas d'un
 * chiffre de l'autre sans le dire. */
function nommerFuseau(fuseau: string | null, nomBloc: string): string {
  if (!fuseau) return `fuseau indisponible, ${nomBloc}`;
  if (fuseau === 'America/Los_Angeles') return `heure du Pacifique, celle de ${nomBloc}`;
  if (fuseau === 'UTC') return `UTC, celle de ${nomBloc}`;
  return `${fuseau}, celle de ${nomBloc}`;
}

/** Un début et une fin identiques ne forment pas une période : c'est un
 * relevé ponctuel (passage technique quotidien, par exemple), pas une
 * fenêtre de 28 jours. L'afficher en « J → J (fuseau) » suggérait à tort
 * une plage, et prêtait le fuseau/nom du bloc appelant même quand le relevé
 * ne venait pas de lui. On le dit alors simplement, sans nommer de bloc. */
function formatFenetre(fenetre: FenetreRapport | null, nomBloc: string): string {
  if (!fenetre || (!fenetre.debut && !fenetre.fin)) return 'fenêtre indisponible';
  if (fenetre.debut && fenetre.fin && fenetre.debut.slice(0, 10) === fenetre.fin.slice(0, 10)) {
    const date = parseDateSeule(fenetre.debut);
    if (date) return `Relevé du ${formatDateLongue(date, true)}`;
  }
  const debut = formatDateSeule(fenetre.debut);
  const fin = formatDateSeule(fenetre.fin);
  return `${debut} → ${fin} (${nommerFuseau(fenetre.fuseau, nomBloc)})`;
}

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

interface DateSeule {
  annee: number;
  mois: number; // 1-12
  jour: number;
}

/** Comme formatDateSeule, mais rend des composants numériques exploitables
 * (calcul de durée, décalage de jours) plutôt qu'une chaîne d'affichage. */
function parseDateSeule(iso: string | null): DateSeule | null {
  if (!iso) return null;
  const correspondance = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!correspondance) return null;
  const [, annee, mois, jour] = correspondance;
  return { annee: Number(annee), mois: Number(mois), jour: Number(jour) };
}

/** Décale une date calendaire d'un nombre de jours (positif ou négatif), en
 * UTC pur : une fenêtre est une plage de JOURS dans le fuseau de sa source,
 * jamais un instant, donc aucune conversion de fuseau n'intervient ici. */
function decalerJours(date: DateSeule, delta: number): DateSeule {
  const t = Date.UTC(date.annee, date.mois - 1, date.jour + delta);
  const d = new Date(t);
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate() };
}

/** Nombre de jours inclusif entre deux dates calendaires (21 août au
 * 17 septembre inclus = 28 jours), ou null si l'ordre est invalide. */
function joursInclusifs(debut: DateSeule, fin: DateSeule): number | null {
  const t1 = Date.UTC(debut.annee, debut.mois - 1, debut.jour);
  const t2 = Date.UTC(fin.annee, fin.mois - 1, fin.jour);
  const diff = Math.round((t2 - t1) / 86_400_000);
  return diff >= 0 ? diff + 1 : null;
}

const ORDINAUX = [
  'première',
  'deuxième',
  'troisième',
  'quatrième',
  'cinquième',
  'sixième',
  'septième',
  'huitième',
  'neuvième',
  'dixième',
];

/** Lit une position moyenne en mots, à partir de la valeur affichée (et non
 * d'un exemple écrit en dur, qui affichait « 6,6 » à côté d'un 6,9) : 6,9 →
 * « sixième ou septième position ». Au-delà de dix, la première page est
 * dépassée et l'ordinal n'apporte plus rien : on le dit simplement. */
function lireRang(position: number): string {
  const bas = Math.floor(position);
  const haut = Math.ceil(position);
  if (bas < 1 || haut > ORDINAUX.length) return 'une place au-delà de la première page';
  if (bas === haut) return `la ${ORDINAUX[bas - 1]} position`;
  return `la ${ORDINAUX[bas - 1]} ou ${ORDINAUX[haut - 1]} position`;
}

function formatDateLongue(date: DateSeule, avecAnnee: boolean): string {
  const base = `${date.jour} ${MOIS_FR[date.mois - 1]}`;
  return avecAnnee ? `${base} ${date.annee}` : base;
}

/** Fenêtre en dates lisibles, à côté des chiffres qu'elle date : « 28 jours,
 * du 21 août au 17 septembre 2026 ». Contrairement à formatFenetre (utilisée
 * dans « Fenêtres d'analyse » pour la vérification), aucun repli textuel
 * n'est rendu quand la fenêtre est indisponible : la ligne reste tue, une
 * période inconnue ne s'affiche pas comme si elle valait la peine d'être lue
 * à côté des chiffres. */
function formatFenetreLongue(fenetre: FenetreRapport | null): string | null {
  const debut = parseDateSeule(fenetre?.debut ?? null);
  const fin = parseDateSeule(fenetre?.fin ?? null);
  if (!debut || !fin) return null;
  const jours = joursInclusifs(debut, fin);
  // Même règle que formatFenetre : un début et une fin identiques sont un
  // relevé ponctuel (passage technique), pas « 1 jours, du 9 au 9 ».
  if (jours === 1) return `Relevé du ${formatDateLongue(fin, true)}`;
  const memeAnnee = debut.annee === fin.annee;
  const texteDebut = formatDateLongue(debut, !memeAnnee);
  const texteFin = formatDateLongue(fin, true);
  const prefixe = jours !== null ? `${jours} jours, ` : '';
  return `${prefixe}du ${texteDebut} au ${texteFin}`;
}

/** Jours calendaires de données dont dispose une page modifiée à `date`,
 * jusqu'à la fin de la fenêtre (incluse). null si l'une des deux dates est
 * illisible. Une date postérieure à la fin donne 0. */
function joursDeDonnees(date: string | null, finFenetre: string | null): number | null {
  const d = parseDateSeule(date);
  const f = parseDateSeule(finFenetre);
  if (!d || !f) return null;
  const jours = joursInclusifs(d, f);
  return jours ?? 0;
}

/** La fenêtre de comparaison (« 28 jours précédents ») n'est pas transmise
 * par la collecte : elle se déduit du début de la fenêtre courante, les
 * 28 jours qui le précèdent immédiatement. */
function formatFenetrePrecedente(fenetre: FenetreRapport | null): string | null {
  const debut = parseDateSeule(fenetre?.debut ?? null);
  if (!debut) return null;
  const finPrecedente = decalerJours(debut, -1);
  const debutPrecedente = decalerJours(debut, -28);
  return formatFenetreLongue({
    debut: `${debutPrecedente.annee}-${String(debutPrecedente.mois).padStart(2, '0')}-${String(debutPrecedente.jour).padStart(2, '0')}`,
    fin: `${finPrecedente.annee}-${String(finPrecedente.mois).padStart(2, '0')}-${String(finPrecedente.jour).padStart(2, '0')}`,
    fuseau: fenetre?.fuseau ?? null,
  });
}

/** null = pages absent ou du mauvais type (donnée manquante) : indisponible.
 * [] = tableau présent et vide : une couverture nulle est la panne la plus
 * bruyante possible côté crawl (le script tourne, ne trouve presque rien) —
 * une alerte ambre, jamais un zéro calme. Une couverture très inférieure au
 * sitemap alerte de la même façon, sans être nulle pour autant. */
function couvertureFaible(pages: PageCrawl[] | null): boolean {
  if (pages === null) return false; // donnée manquante, déjà signalée ailleurs
  return pages.length < getNombreDePages() * COUVERTURE_MINIMALE;
}

function valeurPagesPassees(pages: PageCrawl[] | null): { texte: string; alarme: boolean } {
  if (pages === null) return { texte: 'indisponible', alarme: false };
  if (pages.length === 0) return { texte: 'aucune : couverture nulle', alarme: true };
  if (couvertureFaible(pages)) {
    return {
      texte: `${pages.length.toLocaleString('fr-BE')} (couverture très faible)`,
      alarme: true,
    };
  }
  return { texte: pages.length.toLocaleString('fr-BE'), alarme: false };
}

/** null = liste de pages manquante : donnée manquante. Sinon, le compte brut
 * de pages qui n'ont pas le champ demandé (0 compris) : la mise en forme
 * (« aucune », alarme) est décidée par l'appelant, jamais ici. */
function compterManquantsNombre(
  pages: PageCrawl[] | null,
  manque: (p: PageCrawl) => boolean,
): number | null {
  return pages === null ? null : pages.filter(manque).length;
}

interface AnomalieCrawl {
  label: string;
  n: number | null;
}

interface SyntheseAnomaliesCrawl {
  aucuneAnomalie: boolean;
  phrase: string;
  items: { label: string; valeur: string; alarme: boolean }[];
}

/** Un passage technique « sonde réussie » qui ne trouve rien à redire doit
 * se lire comme un résultat affirmatif (« 628 pages contrôlées, aucune
 * anomalie »), pas comme une grille de cartes « aucune » qu'on peut lire
 * comme un vide. À l'inverse, dès qu'une anomalie existe (y compris les
 * pages qui ne répondent pas 200, jusque-là absentes de ce résumé), elle est
 * listée nommément : une phrase rassurante ne doit jamais coexister avec des
 * pages cassées sous silence. */
function syntheseAnomaliesCrawl(donnees: CrawlDonnees): SyntheseAnomaliesCrawl | null {
  const pages = donnees.pages;
  const categories: AnomalieCrawl[] = [
    { label: 'Bloquées', n: donnees.bloquees },
    { label: 'Échecs', n: donnees.echecs },
    { label: 'Pages sans statut 200', n: pages === null ? null : pagesCassees(pages).length },
    { label: 'Pages sans titre', n: compterManquantsNombre(pages, (p) => !p.titre) },
    {
      label: 'Pages sans description',
      n: compterManquantsNombre(pages, (p) => !p.description),
    },
    {
      label: 'Pages sans hreflang',
      n: compterManquantsNombre(pages, (p) => p.hreflang.length === 0),
    },
    {
      label: 'Pages au statut inconnu',
      n: compterManquantsNombre(pages, (p) => p.statut === null),
    },
  ];

  const toutesConnues = categories.every((c) => c.n !== null);
  const total = toutesConnues ? categories.reduce((acc, c) => acc + (c.n as number), 0) : null;
  const couvertureOk = pages !== null && pages.length > 0 && !couvertureFaible(pages);

  if (toutesConnues && total === 0 && couvertureOk) {
    return {
      aucuneAnomalie: true,
      phrase: `${pages!.length.toLocaleString('fr-BE')} pages contrôlées, aucune anomalie.`,
      items: [],
    };
  }

  const items = categories
    .filter((c) => c.n !== 0)
    .map((c) => ({
      label: c.label,
      valeur: c.n === null ? 'indisponible' : c.n.toLocaleString('fr-BE'),
      alarme: c.n !== null,
    }));

  return { aucuneAnomalie: false, phrase: '', items };
}

/** Empreinte tronquée : le dépôt et la machine de production peuvent
 * diverger, la CI ne déployant pas deploy/. Affichée en entier via title
 * pour rester vérifiable sans alourdir la mise en page. */
function EmpreinteScript({ sha }: { sha: string | null }) {
  if (!sha) return <span>indisponible</span>;
  return (
    <code className="break-all text-xs" title={sha}>
      {sha.slice(0, 12)}…
    </code>
  );
}

function EtatBloc({ nom, bloc }: { nom: string; bloc: Bloc<unknown> }) {
  if (bloc.status === 'ok') return null;
  return (
    <p
      role="alert"
      className="mb-4 rounded border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-fg"
    >
      {nom} : {LIBELLES_STATUT[bloc.status]}
      {bloc.message ? ` (${bloc.message})` : ''}. Les autres blocs restent affichés ci-dessous quand
      ils sont à jour.
    </p>
  );
}

function VerdictFraicheur({ freshness }: { freshness: Freshness | null }) {
  if (!freshness) return <span className="text-neutral-500">fraîcheur indisponible</span>;
  const classe = freshness.level === 'fresh' ? 'text-neutral-500' : 'font-medium text-warning-fg';
  return <span className={classe}>{freshness.label}</span>;
}

/** Sonde et fraîcheur, l'une à côté de l'autre : une sonde réussie sur un
 * relevé vieux de dix jours doit le dire ici, pas seulement dans un verdict
 * global en haut de page. L'empreinte du script n'est plus ici : voir
 * l'annexe « Empreinte de la collecte ». */
function MetaBloc({
  bloc,
  freshness,
  avecFinDonnees = false,
}: {
  bloc: Bloc<unknown>;
  freshness: Freshness | null;
  avecFinDonnees?: boolean;
}) {
  return (
    <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
      <span>
        Sonde : <span className="text-neutral-700">{LIBELLES_STATUT[bloc.status]}</span>
      </span>
      <span>
        Relevé (heure de Bruxelles) :{' '}
        <span className="text-neutral-700">{formatHoraire(bloc.generatedAt)}</span>
        {' · '}
        <VerdictFraicheur freshness={freshness} />
      </span>
      {/* La fraîcheur dit quand la sonde a tourné, pas jusqu'où vont les
          données : un relevé de ce matin peut porter des chiffres Search
          Console arrêtés trois jours plus tôt. */}
      {avecFinDonnees && bloc.fenetre?.fin && (
        <span>
          Données jusqu&apos;au :{' '}
          <span className="text-neutral-700">{formatDateSeule(bloc.fenetre.fin)} inclus</span>
        </span>
      )}
    </p>
  );
}

/** Écart signé à la période précédente, en texte : « −152 (−15,0 %) ».
 * Le sens est porté par le signe et les mots, jamais par une couleur (pas de
 * rouge ni de vert sur ce site). null si l'une des deux valeurs manque, ou si
 * la période précédente vaut zéro (pourcentage indéfini : seul l'écart brut
 * est donné). */
export function formatEcart(actuel: number | null, precedent: number | null): string | null {
  if (actuel === null || precedent === null) return null;
  const diff = actuel - precedent;
  const signe = diff > 0 ? '+' : diff < 0 ? '\u2212' : '';
  const brut = `${signe}${Math.abs(diff).toLocaleString('fr-BE')}`;
  if (precedent === 0) return brut;
  const pct = (Math.abs(diff) / precedent) * 100;
  return `${brut} (${signe}${formatDecimal(pct, 1)} %)`;
}

function Stat({
  label,
  value,
  alarme = false,
  detail,
}: {
  label: string;
  value: string;
  alarme?: boolean;
  detail?: string | null;
}) {
  return (
    <div
      className={
        alarme
          ? 'rounded border border-warning-border bg-warning-bg p-3'
          : 'rounded border border-neutral-200 bg-neutral-50 p-3'
      }
    >
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd
        // break-all : un chiffre énorme mais positif (10^308 impressions)
        // n'est pas une valeur impossible, elle s'affiche telle quelle —
        // mais sans repli, sa chaîne formatée déborde la carte sur
        // téléphone. Le nombre reste lisible en entier, juste enveloppé.
        className={
          alarme
            ? 'mt-1 break-all text-lg font-semibold tabular-nums text-warning-fg'
            : 'mt-1 break-all text-lg font-semibold tabular-nums text-neutral-900'
        }
      >
        {value}
      </dd>
      {detail && <dd className="mt-0.5 text-xs text-neutral-600">{detail}</dd>}
    </div>
  );
}

/** `legende` : le `<caption>` du tableau, lu par les lecteurs d'écran (EAA).
 * Visuellement masqué, puisque le titre visible est déjà juste au-dessus. */
function TableauEnveloppe({ legende, children }: { legende: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-sm">
        <caption className="sr-only">{legende}</caption>
        {children}
      </table>
    </div>
  );
}

// --- « D'où viennent les lecteurs » (referents Umami, contrat v2) ---------

// Cinq lignes au plus par liste, même si le contrat en autorise jusqu'à dix
// côté producteur : sur téléphone, une liste plus longue que ça n'est plus
// courte.
const TRONCATURE_LISTES_REFERENTS = 5;

/** Liste à une colonne (jamais un tableau large) : chaque source avec son
 * compte de visites, en pile verticale, lisible sur téléphone. */
function ListeSources({
  titre,
  liste,
  videTexte,
}: {
  titre: string;
  liste: SourceVisites[];
  videTexte: string | null;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900">{titre}</h3>
      {liste.length === 0 ? (
        videTexte && <p className="text-sm text-neutral-600">{videTexte}</p>
      ) : (
        <>
          {liste.length > TRONCATURE_LISTES_REFERENTS && (
            <p className="mb-1 text-xs text-neutral-500">
              {TRONCATURE_LISTES_REFERENTS} premiers sur {liste.length}.
            </p>
          )}
          <ul className="space-y-1">
            {liste.slice(0, TRONCATURE_LISTES_REFERENTS).map((s) => (
              <li
                key={s.source}
                className="flex justify-between gap-3 rounded border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm"
              >
                <span className="break-all text-neutral-800">{s.source}</span>
                <span className="shrink-0 tabular-nums text-neutral-700">
                  {formatNombre(s.visites)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Le total de `referents.moteursHorsGoogle` n'est PAS la somme de sa liste,
 * plafonnée à dix côté producteur : on affiche le total transmis tel quel,
 * jamais une somme recalculée à partir de la liste tronquée. */
function BlocMoteursHorsGoogle({
  moteurs,
}: {
  moteurs: { liste: SourceVisites[]; total: number | null };
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900">
        Moteurs de recherche, hors Google
      </h3>
      <p className="text-sm text-neutral-700">
        Total : <span className="font-semibold tabular-nums">{formatNombre(moteurs.total)}</span>
      </p>
      {moteurs.liste.length === 0 ? (
        <p className="mt-1 text-sm text-neutral-600">
          Détail par moteur indisponible sur cette période.
        </p>
      ) : (
        <>
          {moteurs.liste.length > TRONCATURE_LISTES_REFERENTS && (
            <p className="mb-1 mt-2 text-xs text-neutral-500">
              {TRONCATURE_LISTES_REFERENTS} premiers sur {moteurs.liste.length}.
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {moteurs.liste.slice(0, TRONCATURE_LISTES_REFERENTS).map((s) => (
              <li
                key={s.source}
                className="flex justify-between gap-3 rounded border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm"
              >
                <span className="break-all text-neutral-800">{s.source}</span>
                <span className="shrink-0 tabular-nums text-neutral-700">
                  {formatNombre(s.visites)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Une campagne de moins de SEUIL_CAMPAGNE visites ne tient pas une ligne à
 * elle seule (constat du 09/11/2026 : `dubgtcg.dbz` au même rang que
 * `bgm-digest`) : elle est regroupée sous « autres », avec le nombre de
 * sources et de visites. Une campagne au compte indisponible reste listée
 * (« indisponible »), jamais additionnée comme un zéro. */
const SEUIL_CAMPAGNE = 5;

export function regrouperCampagnes(campagnes: SourceVisites[]): {
  listees: SourceVisites[];
  autres: { sources: number; visites: number } | null;
} {
  const petites = campagnes.filter((c) => c.visites !== null && c.visites < SEUIL_CAMPAGNE);
  const listees = campagnes.filter((c) => !(c.visites !== null && c.visites < SEUIL_CAMPAGNE));
  if (petites.length === 0) return { listees, autres: null };
  return {
    listees,
    autres: {
      sources: petites.length,
      visites: petites.reduce((s, c) => s + (c.visites as number), 0),
    },
  };
}

/** `referents.campagnes` ventile TOUS les `utm_source`, y compris des
 * assistants qui marquent leur propre lien (ChatGPT) : ceux-là figurent déjà
 * dans `visitesIa` (référent OU paramètre de campagne, dédoublonné par visite
 * côté SQL). On ne les liste donc qu'une fois, sous « Assistants ». */
function sourcesDejaCompteesCommeAssistants(visitesIa: VisiteIa[] | null): Set<string> {
  return new Set((visitesIa ?? []).map((v) => v.source));
}

/**
 * « D'où viennent les lecteurs » : une liste par canal. `referents === null`
 * (mesure jamais transmise) et un `referents` aux listes vides (zéro
 * constaté) restent deux messages distincts. Deux phrases d'honnêteté
 * obligatoires : la majorité des visites arrivent sans référent (avec le
 * nombre), et un canal fermé prouve l'ouverture d'un lien depuis un outil de
 * travail, jamais quelle organisation le lit. Les domaines restent bruts
 * (admin à un seul lecteur, décision de Zoltán du 09/11/2026).
 */
function SectionSources({ umami }: { umami: Bloc<UmamiDonnees> }) {
  const disponible = umami.status === 'ok' && !!umami.donnees;
  const referents = disponible ? umami.donnees!.referents : null;
  const visitesIa = disponible ? umami.donnees!.visitesIa : null;
  const assistants = sourcesDejaCompteesCommeAssistants(visitesIa);
  const campagnes = regrouperCampagnes(
    referents ? referents.campagnes.filter((c) => !assistants.has(c.source)) : [],
  );

  return (
    <section className="mb-10" aria-labelledby="titre-sources">
      <h2 id="titre-sources" className="mb-3 text-xl font-semibold text-neutral-900">
        D&apos;où viennent les lecteurs
      </h2>
      {!disponible && (
        <p className="text-sm text-neutral-600">
          indisponible : le bloc Umami n&apos;est pas à jour (voir l&apos;état des sources en haut
          de page).
        </p>
      )}
      {disponible && referents === null && (
        <p className="text-sm text-neutral-600">
          Sites, moteurs et campagnes indisponibles : cette mesure n&apos;a pas été transmise dans
          ce relevé.
        </p>
      )}
      {disponible && referents !== null && (
        <p className="mb-2 text-sm text-neutral-700">
          La majorité des visites arrivent sans référent identifiable :{' '}
          <span className="font-semibold tabular-nums">{formatNombre(referents.sansReferent)}</span>{' '}
          sur la période. Les listes ci-dessous comptent donc pour moins qu&apos;elles n&apos;en ont
          l&apos;air.
        </p>
      )}
      {disponible && (
        <>
          {referents !== null && <BlocMoteursHorsGoogle moteurs={referents.moteursHorsGoogle} />}
          {visitesIa === null ? (
            <div className="mt-4">
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">Assistants</h3>
              <p className="text-sm text-neutral-600">indisponible dans ce relevé.</p>
            </div>
          ) : (
            <ListeSources
              titre="Assistants (comptés une seule fois, par référent ou par lien marqué)"
              liste={visitesIa}
              videTexte="Aucune visite d'assistant sur la période."
            />
          )}
          {referents !== null && (
            <>
              <ListeSources
                titre="Sites qui pointent vers governance.brussels"
                liste={referents.sitesReferents}
                videTexte="Aucun site référent sur la période."
              />
              <ListeSources
                titre="Outils de travail (canaux fermés)"
                liste={referents.canauxFermes}
                videTexte="Aucun canal fermé sur la période."
              />
              <p className="mt-2 text-xs text-neutral-600">
                Un canal fermé prouve qu&apos;un lien a été ouvert depuis un outil de travail,
                jamais quelle organisation l&apos;a lu : cette liste ne permet pas de le déduire.
              </p>
              <ListeSources
                titre="Vos envois et campagnes"
                liste={campagnes.listees}
                videTexte={campagnes.autres ? null : 'Aucune visite de campagne sur la période.'}
              />
              {campagnes.autres && (
                <p className="mt-1 text-sm text-neutral-700" data-testid="campagnes-autres">
                  autres ({campagnes.autres.sources}{' '}
                  {campagnes.autres.sources > 1 ? 'sources' : 'source'},{' '}
                  {formatNombre(campagnes.autres.visites)}{' '}
                  {campagnes.autres.visites > 1 ? 'visites' : 'visite'})
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

// --- « Par langue » (GSC 4 parLangue, Umami 3 visitesParLangue) ---------

const NOMS_LANGUES: Record<string, string> = {
  fr: 'Français',
  nl: 'Néerlandais',
  en: 'Anglais',
  de: 'Allemand',
  autre: 'Autres pages',
};

/**
 * « Par langue » : répond à « faut-il continuer à traduire ? ». Les clics
 * viennent de Search Console (Belgique seule, pages regroupées par langue du
 * chemin), les visites d'Umami (page d'entrée de chaque visite). Deux
 * mesures, deux sources : jamais additionnées, chacune dans sa colonne. La
 * section ne s'affiche que si au moins une des deux est transmise (GSC 4 ou
 * Umami 3) : avant, aucune donnée ne permet de répondre.
 */
/**
 * Constat du 09/11/2026 (premier relevé GSC 4) : la somme des clics belges
 * page par page valait 77, pour 860 clics belges au total de la propriété.
 * Ce n'est pas une erreur de la collecte : dès qu'une requête Search Console
 * croise la dimension « page » avec un filtre pays, Google ne restitue
 * qu'une partie du trafic (agrégation par page, requêtes anonymisées, lignes
 * plafonnées). Tout chiffre par page (tableau des pages, règle de chute,
 * langues) ne couvre donc qu'une fraction des clics : la page le dit, chiffre
 * à l'appui, au lieu de laisser additionner ou comparer au total.
 */
export function couverturePages(
  sommePages: number | null,
  totalBelgique: number | null,
): { somme: number; total: number; part: number } | null {
  if (sommePages === null || totalBelgique === null || totalBelgique <= 0) return null;
  return { somme: sommePages, total: totalBelgique, part: sommePages / totalBelgique };
}

function couvertureDe(donnees: GscDonnees | null) {
  if (!donnees || donnees.parLangue === null) return null;
  return couverturePages(
    donnees.parLangue.reduce((s, l) => s + (l.clics ?? 0), 0),
    donnees.clicsBelgique,
  );
}

function NoteCouverture({
  couverture,
}: {
  couverture: { somme: number; total: number; part: number };
}) {
  return (
    <p className="mb-2 text-xs text-neutral-600">
      Les chiffres par page de Search Console couvrent {formatNombre(couverture.somme)} des{' '}
      {formatNombre(couverture.total)} clics belges ({formatPourcentFraction(couverture.part)}) :
      Google ne détaille, page par page et pour un pays, qu&apos;une partie du trafic. Comparer les
      lignes entre elles reste possible ; les additionner pour retrouver le total, non.
    </p>
  );
}

function SectionLangues({ gsc, umami }: { gsc: Bloc<GscDonnees>; umami: Bloc<UmamiDonnees> }) {
  const clics = gsc.status === 'ok' ? (gsc.donnees?.parLangue ?? null) : null;
  const visites = umami.status === 'ok' ? (umami.donnees?.visitesParLangue ?? null) : null;
  if (clics === null && visites === null) return null;
  const couverture = gsc.status === 'ok' ? couvertureDe(gsc.donnees) : null;
  const langues = Array.from(
    new Set([...(clics ?? []).map((l) => l.langue), ...(visites ?? []).map((l) => l.langue)]),
  ).sort((a, b) => {
    // Visites d'abord (mesure complète), clics ensuite pour départager.
    const va = visites?.find((l) => l.langue === a)?.visites ?? -1;
    const vb = visites?.find((l) => l.langue === b)?.visites ?? -1;
    const ca = clics?.find((l) => l.langue === a)?.clics ?? -1;
    const cb = clics?.find((l) => l.langue === b)?.clics ?? -1;
    return vb - va || cb - ca || a.localeCompare(b);
  });
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold text-neutral-900">Par langue</h2>
      <p className="mb-2 text-sm text-neutral-600">
        Visites (Umami, selon la page d&apos;entrée) et clics depuis la Belgique (Search Console),
        regroupés par langue du chemin. Deux sources : ne pas additionner les colonnes. Les visites
        sont complètes, les clics ne le sont pas.
      </p>
      {couverture && <NoteCouverture couverture={couverture} />}
      <TableauEnveloppe legende="Visites et clics depuis la Belgique, par langue">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" className="px-3 py-2">
              Langue
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Visites
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Clics (Belgique)
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              28 jours précédents
            </th>
          </tr>
        </thead>
        <tbody>
          {langues.map((langue) => {
            const c = clics?.find((l) => l.langue === langue) ?? null;
            const v = visites?.find((l) => l.langue === langue) ?? null;
            return (
              <tr key={langue} className="border-t border-neutral-100">
                <td className="px-3 py-2 text-neutral-800">{NOMS_LANGUES[langue] ?? langue}</td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                  {visites === null ? 'indisponible' : formatNombre(v?.visites ?? 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                  {clics === null ? 'indisponible' : formatNombre(c?.clics ?? 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                  {clics === null ? 'indisponible' : formatNombre(c?.clicsPrecedents ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableauEnveloppe>
    </section>
  );
}

// --- « Ce que vous avez publié » (publieRecemment GSC, contrat v2) -------

/** Un zéro constaté (page publiée sans le moindre clic ni la moindre
 * impression) et une mesure indisponible (`null`, bloc Umami en panne cette
 * semaine-là) ne se confondent jamais : le zéro reste en ambre, la mesure
 * indisponible reste en gris, jamais à la seule couleur (le texte diffère
 * aussi : « 0 » contre « indisponible »). */
function ValeurConstatee({ valeur, champ }: { valeur: number | null; champ: string }) {
  if (valeur === null) {
    return (
      <dd data-champ={champ} className="mt-0.5 text-neutral-600">
        indisponible
      </dd>
    );
  }
  if (valeur === 0) {
    return (
      <dd data-champ={champ} className="mt-0.5 font-semibold tabular-nums text-warning-fg">
        0
      </dd>
    );
  }
  return (
    <dd data-champ={champ} className="mt-0.5 tabular-nums text-neutral-700">
      {formatNombre(valeur)}
    </dd>
  );
}

/**
 * « Ce que vous avez publié » : la vraie nouveauté du contrat v2. Les zéros
 * sont le sujet (une page publiée qui n'a rien reçu) : ils sont mis en
 * évidence, pas noyés dans la liste. Une colonne, jamais un tableau large :
 * chaque page est une carte empilée, lisible sur téléphone.
 */
function SectionPublications({ gsc }: { gsc: Bloc<GscDonnees> }) {
  const disponible = gsc.status === 'ok' && !!gsc.donnees;
  const toutes: PagePubliee[] = disponible ? gsc.donnees!.publieRecemment.liste : [];
  const total = disponible ? gsc.donnees!.publieRecemment.total : null;
  const finDonnees = gsc.fenetre?.fin ?? null;
  // La date transmise est le <lastmod> du plan du site : la DERNIÈRE
  // modification de la page dans cette langue, pas sa publication. Une page
  // touchée il y a trois jours n'a pas de chiffres interprétables (retard de
  // Search Console, indexation) : son zéro est mécanique. Elle est comptée,
  // pas listée, pour ne pas suggérer qu'une traduction récente « ne sert à
  // rien ». Date illisible : on la garde, plutôt que de la cacher.
  const pages = toutes.filter((p) => {
    const jours = joursDeDonnees(p.datePublication, finDonnees);
    return jours === null || jours >= JOURS_AVANT_JUGEMENT;
  });
  const tropRecentes = toutes.length - pages.length;

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold text-neutral-900">Pages modifiées récemment</h2>
      <p className="mb-4 text-sm text-neutral-600">
        Les pages modifiées pendant la fenêtre du relevé (date du plan du site, propre à chaque
        langue), avec leurs clics depuis la Belgique, leurs impressions et leurs visites Umami.
        Seules les pages qui ont au moins {JOURS_AVANT_JUGEMENT} jours de données sont listées ; un
        zéro constaté y est mis en évidence, distinct d&apos;une mesure indisponible.
      </p>
      {!disponible && (
        <p className="text-sm text-neutral-600">
          indisponible : le bloc Search Console n&apos;est pas à jour (voir l&apos;état des sources
          en haut de page).
        </p>
      )}
      {disponible && toutes.length === 0 && (
        <p className="text-sm text-neutral-600">Aucune page modifiée dans cette fenêtre.</p>
      )}
      {disponible && toutes.length > 0 && (
        <>
          {/* Le total n'est jamais recalculé depuis la liste, plafonnée côté
              collecte : il est affiché tel que transmis. */}
          <p className="mb-2 text-xs text-neutral-500">
            {total !== null
              ? `${formatNombre(total)} ${total > 1 ? 'pages modifiées' : 'page modifiée'} sur la période, ${toutes.length} ${toutes.length > 1 ? 'transmises' : 'transmise'} par la collecte.`
              : `${toutes.length} ${toutes.length > 1 ? 'pages transmises' : 'page transmise'} par la collecte.`}
            {tropRecentes > 0 &&
              ` ${tropRecentes} ${tropRecentes > 1 ? 'ont' : 'a'} moins de ${JOURS_AVANT_JUGEMENT} jours de données : trop tôt pour juger, ${tropRecentes > 1 ? 'elles ne sont pas listées' : 'elle n’est pas listée'}.`}
          </p>
          {pages.length === 0 && (
            <p className="text-sm text-neutral-600">
              Aucune page transmise n&apos;a encore assez de recul pour être jugée.
            </p>
          )}
          <ul className="space-y-3">
            {pages.map((p) => (
              <li key={p.chemin} className="rounded border border-neutral-200 bg-neutral-50 p-3">
                <p className="break-words text-sm font-medium text-neutral-900">
                  {chemin(p.chemin)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Modifiée le {formatDateSeule(p.datePublication)}
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-neutral-500">Clics (Belgique)</dt>
                    <ValeurConstatee champ="clics" valeur={p.clics} />
                  </div>
                  <div>
                    <dt className="text-neutral-500">Impressions</dt>
                    <ValeurConstatee champ="impressions" valeur={p.impressions} />
                  </div>
                  <div>
                    <dt className="text-neutral-500">Visites (Umami)</dt>
                    <ValeurConstatee champ="visitesUmami" valeur={p.visitesUmami} />
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Le contrat commun ne dit pas quel bloc a produit une action donnée
 * (`regle` est un nom libre côté regles.mjs, hors de ce dépôt) : seul le
 * fuseau de sa fenêtre distingue de façon fiable Search Console (heure du
 * Pacifique) des autres sources (UTC, passage technique compris). Ne
 * jamais annoncer Search Console à tort : un nom neutre vaut mieux qu'une
 * fausse attribution constatée en production (relevé UTC affiché comme
 * « celle de Search Console »). */
function nomBlocAction(fuseau: string | null): string {
  return fuseau === 'America/Los_Angeles' ? 'Search Console' : 'la collecte';
}

/** regles.mjs (hors de ce dépôt) pluralise parfois une preuve libre même
 * quand le compte vaut 1, ex. « 1 visites d'assistants ». On ne corrige pas
 * la grammaire d'un texte libre en général (« 1 mois » ne doit pas devenir
 * « 1 moi ») : seul ce motif précis, constaté en production le 20/09/2026,
 * est réaccordé. */
function accorderPreuve(preuve: string): string {
  return preuve.replace(/\b1 visites d'assistants\b/g, "1 visite d'assistant");
}

/**
 * « À faire » : les actions suggérées (trois au plus, calculées côté
 * collecte), puis les titres à revoir. Section ancrée pour la tuile du hub
 * (#actions). Un bloc GSC « ok » mais sans la moindre mesure exploitable
 * n'est pas traité comme « aucune action » : c'est un payload
 * suspect, indisponible comme une panne.
 */
function SectionAFaire({ bloc }: { bloc: Bloc<GscDonnees> }) {
  return (
    <section id="actions" className="mb-10 scroll-mt-4" aria-labelledby="titre-a-faire">
      <h2 id="titre-a-faire" className="mb-3 text-xl font-semibold text-neutral-900">
        À faire
      </h2>
      <ListeActions bloc={bloc} />
      <TitresARevoir bloc={bloc} />
    </section>
  );
}

function ListeActions({ bloc }: { bloc: Bloc<GscDonnees> }) {
  const utilisable = bloc.status === 'ok' && !!bloc.donnees && gscMesurePresente(bloc.donnees);
  const actions = utilisable ? (bloc.donnees?.actions ?? []) : null;
  return (
    <div data-testid="actions-suggerees">
      <h3 className="mb-2 text-lg font-semibold text-neutral-900">Actions suggérées</h3>
      {actions === null && (
        <p className="text-sm text-neutral-600">
          indisponible : le bloc Search Console qui les calcule n&apos;est pas à jour ou n&apos;a
          transmis aucune mesure exploitable dans ce relevé.
        </p>
      )}
      {actions !== null && actions.length === 0 && (
        <p className="text-sm text-neutral-600">Aucune action dans ce relevé.</p>
      )}
      {actions !== null && actions.length > 0 && (
        <ul className="space-y-3">
          {actions.map((action, i) => {
            // Un titre qui répète l'URL entière fait doublon avec le lien
            // affiché juste en dessous : on ne l'écrit qu'une fois. Sans
            // titre fourni, le repli est le nom de la règle seul (pas
            // `règle : chemin`) : le chemin vit déjà dans le lien juste en
            // dessous, l'y répéter dans le titre était le même doublon sous
            // une autre forme.
            const titreDupliqueLeLien = action.titre !== null && action.titre === action.url;
            const titreAffiche = action.titre ?? action.regle;
            // La collecte n'a pas toujours de fenêtre à donner : tant qu'elle
            // n'a pas de dates, la ligne reste tue plutôt que d'afficher
            // « fenêtre indisponible » sous chaque action.
            const fenetreTexte =
              action.fenetre?.debut || action.fenetre?.fin
                ? formatFenetre(action.fenetre, nomBlocAction(action.fenetre?.fuseau ?? null))
                : null;
            return (
              <li
                key={`${action.regle}-${action.url}-${i}`}
                className="rounded border border-neutral-200 bg-neutral-50 p-4"
              >
                {!titreDupliqueLeLien && (
                  <p className="text-sm font-semibold break-words text-neutral-900">
                    {titreAffiche}
                  </p>
                )}
                <p className="mt-1 text-xs text-neutral-500">
                  Règle : {action.regle}
                  {action.priorite !== null
                    ? ` · priorité ${action.priorite}`
                    : ' · priorité indisponible'}
                </p>
                <p className="mt-2 text-sm text-neutral-700">{accorderPreuve(action.preuve)}</p>
                <p className="mt-2 text-sm">
                  <a
                    href={action.url}
                    className="break-words text-brand-700 underline-offset-4 hover:underline"
                  >
                    {chemin(action.url)}
                  </a>
                </p>
                {fenetreTexte && (
                  <p className="mt-2 text-xs text-neutral-500">Fenêtre : {fenetreTexte}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * « Titres à revoir » : `opportunitesTitre`, calculé par la collecte depuis le
 * 20/09 mais jamais affiché jusqu'ici (seules les occasions retenues parmi
 * les trois actions apparaissaient). Règle côté bgm-ops (bloc-gsc.mjs) :
 * pages vues depuis la Belgique, au moins 300 impressions, en première page
 * (bandes de position 1-3, 4-6, 7-10, d'au moins cinq pages chacune), dont le
 * taux de clic est inférieur à la moitié du taux médian de leur bande. Le geste
 * qui en découle est éditorial : relire le titre et la description que
 * Google affiche.
 */
function TitresARevoir({ bloc }: { bloc: Bloc<GscDonnees> }) {
  if (bloc.status !== 'ok' || !bloc.donnees) return null;
  const occasions = bloc.donnees.opportunitesTitre;
  return (
    <div className="mt-6" data-testid="titres-a-revoir">
      <h3 className="mb-2 text-lg font-semibold text-neutral-900">Titres à revoir</h3>
      <p className="mb-3 text-sm text-neutral-600">
        Pages en première page de Google depuis la Belgique, vues au moins 300 fois, mais deux fois
        moins cliquées que les pages de même position. Le titre ou la description affichés dans les
        résultats ne donnent probablement pas envie de cliquer.
      </p>
      {occasions.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Aucune page ne remplit ces conditions sur la période.
        </p>
      ) : (
        <ul className="space-y-2">
          {occasions.slice(0, 10).map((o) => (
            <li key={o.url} className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <a
                href={o.url}
                className="break-words font-medium text-brand-700 underline-offset-4 hover:underline"
              >
                {chemin(o.url)}
              </a>
              <p className="mt-1 text-xs text-neutral-600">
                Taux de clic {formatPourcentFraction(o.ctr)} contre{' '}
                {formatPourcentFraction(o.ctrMedianBande)} en médiane
                {o.bande ? ` pour les positions ${o.bande}` : ''} · {formatNombre(o.impressions)}{' '}
                impressions · position {formatDecimal(o.position)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * « Tendance » (lot 2) : la courbe quotidienne des clics belges (Search
 * Console, 56 jours, déjà transmise par GSC 4) et la série hebdomadaire
 * reconstruite depuis l'historique (seo-serie.json). Chaque point de la
 * série couvre 28 jours glissants : deux points successifs se recouvrent à
 * 75 %, la série lisse donc les variations et ne se lit pas comme quatre
 * semaines indépendantes. Rien ne s'affiche tant qu'aucune des deux n'est
 * disponible.
 */
function SectionTendance({ gsc, serie }: { gsc: Bloc<GscDonnees>; serie: SemaineSerie[] | null }) {
  const courants = gsc.status === 'ok' ? (gsc.donnees?.clicsBelgiqueParJour ?? null) : null;
  const precedents =
    gsc.status === 'ok' ? (gsc.donnees?.clicsBelgiqueParJourPrecedent ?? null) : null;
  const semaines = serie ?? [];
  if (courants === null && semaines.length === 0) return null;
  return (
    <div className="mb-8">
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">Tendance</h3>
      {courants !== null && (
        <ClicsBelgiqueParJourChart courants={courants} precedents={precedents ?? []} />
      )}
      {semaines.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-sm font-semibold text-neutral-900">Semaine par semaine</h4>
          <p className="mb-1 text-xs text-neutral-600">
            Chaque ligne est un relevé de 28 jours glissants : deux lignes successives partagent
            trois semaines sur quatre. Une ligne lisse donc les variations, elle ne compte pas une
            semaine isolée.
            {semaines.length < 4 &&
              ` ${semaines.length} ${semaines.length > 1 ? 'relevés' : 'relevé'} pour l'instant.`}
          </p>
          <TableauEnveloppe legende="Relevés hebdomadaires sur 28 jours glissants">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th scope="col" className="px-3 py-2">
                  Données jusqu&apos;au
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Clics (Belgique)
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Visites
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Assistants
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Inscriptions
                </th>
              </tr>
            </thead>
            <tbody>
              {[...semaines].reverse().map((s) => (
                <tr key={s.semaine} className="border-t border-neutral-100">
                  <td className="px-3 py-2 text-neutral-800">
                    {s.gsc.fin ? formatDateSeule(s.gsc.fin) : s.semaine}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                    {formatNombre(s.gsc.clicsBelgique)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                    {formatNombre(s.umami.visites)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                    {formatNombre(s.umami.visitesIa)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                    {formatNombre(s.umami.inscriptions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableauEnveloppe>
        </div>
      )}
    </div>
  );
}

/** Titre + fenêtre lisible, en tête de chaque bloc des annexes : la période
 * se lit à côté des chiffres qu'elle date. */
function TitreSection({ titre, fenetre }: { titre: string; fenetre: FenetreRapport | null }) {
  const fenetreTexte = formatFenetreLongue(fenetre);
  return (
    <>
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">{titre}</h3>
      {fenetreTexte && <p className="mb-3 text-sm text-neutral-600">{fenetreTexte}</p>}
    </>
  );
}

// --- En-tête : une ligne d'état par source ---------------------------------

const ETATS_EN_DEFAUT: Record<Exclude<StatutBloc, 'ok'>, string> = {
  error: 'en panne',
  blocked: 'bloqué',
  absent: 'aucun relevé',
  'format-inconnu': 'format non reconnu',
};

/** « à jour », « en retard : dernier relevé il y a 3 j », « en panne »… La
 * sonde réussie ne suffit pas à dire « à jour » : seule la fraîcheur le dit.
 * Ambre uniquement pour une anomalie réelle (panne, retard, horloge). */
export function etatSource(
  status: StatutBloc,
  freshness: Freshness | null,
): { texte: string; anomalie: boolean } {
  if (status !== 'ok') return { texte: ETATS_EN_DEFAUT[status], anomalie: true };
  if (!freshness) return { texte: 'fraîcheur inconnue', anomalie: false };
  if (freshness.level === 'fresh') return { texte: 'à jour', anomalie: false };
  return { texte: freshness.label, anomalie: true };
}

function LigneEtatSource({
  nom,
  bloc,
  freshness,
  libelleDate,
}: {
  nom: string;
  bloc: Bloc<unknown>;
  freshness: Freshness | null;
  libelleDate: string;
}) {
  const etat = etatSource(bloc.status, freshness);
  // La date des DONNÉES, pas celle du relevé : un relevé de ce matin porte
  // des chiffres Search Console arrêtés deux à trois jours plus tôt.
  const fin = bloc.status === 'ok' ? (bloc.fenetre?.fin ?? null) : null;
  return (
    <li>
      <span className="font-medium text-neutral-900">{nom}</span> :{' '}
      <span className={etat.anomalie ? 'font-medium text-warning-fg' : 'text-neutral-700'}>
        {etat.texte}
      </span>
      {bloc.status === 'ok' && (
        <span className="text-neutral-600">
          {fin ? `, ${libelleDate} ${formatDateSeule(fin)}` : ', date des données indisponible'}
        </span>
      )}
    </li>
  );
}

// --- En bref : le verdict ---------------------------------------------------

function SectionEnBref({ rapport }: { rapport: RapportSeo }) {
  const phrases = verdictRapport(rapport);
  return (
    <section className="mb-10" aria-labelledby="titre-en-bref">
      <h2 id="titre-en-bref" className="mb-2 text-xl font-semibold text-neutral-900">
        En bref
      </h2>
      <p data-testid="verdict" className="text-base text-neutral-900">
        {phrases.length > 0 ? phrases.join(' ') : 'Aucun verdict possible sur ce relevé.'}
      </p>
    </section>
  );
}

// --- L'essentiel : quatre chiffres, puis la tendance -----------------------

/** Visites d'assistants, une seule fois : la somme de `visitesIa` (référent
 * OU paramètre de campagne, déjà dédoublonnée par visite côté SQL). `null` si
 * la liste manque ou si une ligne a un compte illisible (une somme partielle
 * serait un chiffre faux) ; [] donne un vrai zéro constaté. */
export function totalVisitesIa(visitesIa: VisiteIa[] | null): number | null {
  if (visitesIa === null) return null;
  if (visitesIa.some((v) => v.visites === null)) return null;
  return visitesIa.reduce((s, v) => s + (v.visites as number), 0);
}

/** Les deux fenêtres coïncident quand elles couvrent le même jour calendaire
 * de début et de fin (les fuseaux, eux, restent différents : Pacifique pour
 * Search Console, UTC pour Umami). */
function fenetresAlignees(a: FenetreRapport | null, b: FenetreRapport | null): boolean {
  if (!a?.debut || !a?.fin || !b?.debut || !b?.fin) return false;
  return a.debut.slice(0, 10) === b.debut.slice(0, 10) && a.fin.slice(0, 10) === b.fin.slice(0, 10);
}

function fenetreComplete(f: FenetreRapport | null): boolean {
  return !!f?.debut && !!f?.fin;
}

/** Quatre chiffres de deux sources côte à côte : on dit tout de suite quand
 * leurs fenêtres ne coïncident pas (ambre, role="alert", le texte porte
 * l'interdiction), et l'on se tait quand elles coïncident (la réserve vit
 * alors dans « Comment lire »). Une fenêtre manquante n'est pas une
 * anomalie de plus : la bannière du bloc la signale déjà. */
function AvertissementFenetres({
  gsc,
  umami,
}: {
  gsc: FenetreRapport | null;
  umami: FenetreRapport | null;
}) {
  if (fenetresAlignees(gsc, umami)) return null;
  if (fenetreComplete(gsc) && fenetreComplete(umami)) {
    return (
      <p
        role="alert"
        className="mb-4 rounded border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-fg"
      >
        Cette fois, les fenêtres de Search Console et d&apos;Umami ne coïncident pas : ne rapprochez
        pas leurs chiffres.
      </p>
    );
  }
  return (
    <p className="mb-3 text-xs text-neutral-600">
      Fenêtre de Search Console ou d&apos;Umami indisponible : ne rapprochez pas leurs chiffres.
    </p>
  );
}

function SectionEssentiel({
  gsc,
  umami,
  serie,
}: {
  gsc: Bloc<GscDonnees>;
  umami: Bloc<UmamiDonnees>;
  serie: SemaineSerie[] | null;
}) {
  const g = gsc.status === 'ok' ? gsc.donnees : null;
  const u = umami.status === 'ok' ? umami.donnees : null;
  const ecart = g ? formatEcart(g.clicsBelgique, g.clicsBelgiquePrecedents) : null;
  const inscriptions = u?.inscriptions ?? null;
  const fenetreTexte = formatFenetreLongue(gsc.fenetre);
  const fenetrePrecedenteTexte = formatFenetrePrecedente(gsc.fenetre);
  return (
    <section className="mb-10" aria-labelledby="titre-essentiel">
      <h2 id="titre-essentiel" className="mb-1 text-xl font-semibold text-neutral-900">
        L&apos;essentiel
      </h2>
      {fenetreTexte && <p className="mb-3 text-sm text-neutral-600">{fenetreTexte}</p>}
      <AvertissementFenetres gsc={gsc.fenetre} umami={umami.fenetre} />
      <dl data-testid="essentiel" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Clics depuis la Belgique"
          value={formatNombre(g?.clicsBelgique ?? null)}
          detail={ecart ? `${ecart} par rapport aux 28 jours précédents` : null}
        />
        <Stat label="Visites" value={formatNombre(u?.visites ?? null)} />
        <Stat
          label="Inscriptions envoyées"
          value={formatNombre(inscriptions?.total ?? null)}
          detail={
            inscriptions
              ? inscriptions.visites !== null
                ? `dans ${formatNombre(inscriptions.visites)} ${inscriptions.visites > 1 ? 'visites' : 'visite'}, réinscriptions comprises`
                : 'réinscriptions comprises'
              : null
          }
        />
        <Stat
          label="Visites d'assistants"
          value={formatNombre(totalVisitesIa(u?.visitesIa ?? null))}
          detail="comptées une seule fois"
        />
      </dl>
      <details className="mt-3 text-xs text-neutral-600">
        <summary className="cursor-pointer text-sm text-neutral-700">
          Comment lire ces chiffres
        </summary>
        <ul className="mt-2 space-y-1.5">
          <li>
            Clics depuis la Belgique : Search Console, clics venus de Belgique sur la période,
            comparés aux 28 jours précédents
            {fenetrePrecedenteTexte ? ` (${fenetrePrecedenteTexte})` : ''}.
          </li>
          <li>
            Visites : Umami, toutes provenances, chaque visite comptée une fois quel que soit le
            nombre de pages vues ; des robots non identifiés peuvent s&apos;y mêler.
          </li>
          <li>
            Inscriptions envoyées : formulaires d&apos;abonnement acceptés par le serveur. Une
            personne déjà abonnée qui se réinscrit est comptée aussi : ce n&apos;est pas le nombre
            de nouveaux abonnés.
          </li>
          <li>
            Visites d&apos;assistants : visites venues d&apos;un assistant (ChatGPT, Perplexity…),
            repérées par l&apos;adresse d&apos;origine ou par le lien marqué de l&apos;assistant,
            chaque visite comptée une seule fois.
          </li>
          {fenetresAlignees(gsc.fenetre, umami.fenetre) && (
            <li data-testid="rapprochement">
              Search Console et Umami couvrent les mêmes 28 jours : vous pouvez rapprocher leurs
              chiffres. Search Console publie ses données avec environ trois jours de retard, sa
              fenêtre s&apos;arrête donc trois jours avant aujourd&apos;hui. Les deux outils
              découpent leurs journées dans des fuseaux différents, ce qui laisse quelques heures
              d&apos;écart aux bords de la période.
            </li>
          )}
        </ul>
      </details>
      <SectionTendance gsc={gsc} serie={serie} />
    </section>
  );
}

// --- Ce qui monte, ce qui baisse ---------------------------------------------

function ecartBrut(p: PageGsc): number | null {
  return p.clics !== null && p.clicsPrecedents !== null ? p.clics - p.clicsPrecedents : null;
}

/** Les pages qui bougent le plus d'abord (écart absolu décroissant) ; une
 * page sans comparaison possible passe en dernier, jamais comptée à zéro. */
export function trierParEcart(pages: PageGsc[]): PageGsc[] {
  return [...pages].sort((a, b) => {
    const da = ecartBrut(a);
    const db = ecartBrut(b);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return Math.abs(db) - Math.abs(da);
  });
}

function SectionMouvements({ gsc }: { gsc: Bloc<GscDonnees> }) {
  const donnees = gsc.status === 'ok' ? gsc.donnees : null;
  const couverture = couvertureDe(donnees);
  return (
    <section className="mb-10" aria-labelledby="titre-mouvements">
      <h2 id="titre-mouvements" className="mb-3 text-xl font-semibold text-neutral-900">
        Ce qui monte, ce qui baisse
      </h2>
      {!donnees ? (
        <p className="text-sm text-neutral-600">
          indisponible : le bloc Search Console n&apos;est pas à jour.
        </p>
      ) : (
        <>
          <h3 className="mb-1 text-lg font-semibold text-neutral-900">
            Pages les plus cliquées depuis la Belgique
          </h3>
          {couverture && <NoteCouverture couverture={couverture} />}
          {donnees.pages.length === 0 ? (
            <p className="text-sm text-neutral-600">Aucune page transmise sur la période.</p>
          ) : (
            <TableauEnveloppe legende="Pages les plus cliquées depuis la Belgique, avec l'écart aux 28 jours précédents">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th scope="col" className="px-3 py-2">
                    Chemin
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Clics
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    28 jours précédents
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Écart
                  </th>
                </tr>
              </thead>
              <tbody>
                {trierParEcart(donnees.pages)
                  .slice(0, 10)
                  .map((p) => (
                    <tr key={p.url} className="border-t border-neutral-100">
                      <td className="px-3 py-2 break-words text-neutral-800">{chemin(p.url)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                        {formatNombre(p.clics)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                        {formatNombre(p.clicsPrecedents)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap text-neutral-700">
                        {formatEcart(p.clics, p.clicsPrecedents) ?? 'indisponible'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </TableauEnveloppe>
          )}

          <h3 className="mt-6 mb-1 text-lg font-semibold text-neutral-900">
            Requêtes émergentes{' '}
            {donnees.requetesBelgique ? 'depuis la Belgique' : '(le monde entier)'}
          </h3>
          <p className="mb-2 text-xs text-neutral-600">
            Le site apparaît sur ces requêtes, en impressions en hausse, sans qu&apos;aucun clic ne
            soit garanti : il peut être classé au-delà de la première page de résultats, vu mais pas
            encore lu.
          </p>
          {donnees.requetesEmergentes.length === 0 ? (
            <p className="text-sm text-neutral-600">Aucune requête émergente sur la période.</p>
          ) : (
            <ul className="space-y-1.5">
              {donnees.requetesEmergentes.slice(0, 5).map((r) => (
                <li
                  key={r.requete}
                  className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm"
                >
                  <p className="break-words font-medium text-neutral-800">{r.requete}</p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Impressions : {formatNombre(r.impressions)}
                    {r.impressionsPrecedentes !== null
                      ? ` (contre ${formatNombre(r.impressionsPrecedentes)} avant)`
                      : ''}
                    {' · '}Position : {formatDecimal(r.position)}
                  </p>
                  <p className="mt-1 text-xs">
                    {r.page ? (
                      <>
                        <span className="text-neutral-600">Page montrée : </span>
                        <a
                          href={r.page}
                          className="break-words text-brand-700 underline-offset-4 hover:underline"
                        >
                          {chemin(r.page)}
                        </a>
                      </>
                    ) : (
                      <span className="text-neutral-600">Page montrée : indisponible</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// --- Santé technique --------------------------------------------------------

function TablePagesCassees({ pages }: { pages: PageCrawl[] }) {
  // pagesCassees() exclut les pages au statut inconnu (null) : une page
  // jamais contrôlée n'est pas prouvée cassée, elle est comptée à part
  // (« Pages au statut inconnu »).
  const cassees = pagesCassees(pages);
  const TRONCATURE = 20;
  if (cassees.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-sm font-semibold text-neutral-900">Pages sans statut 200</h3>
      {cassees.length > TRONCATURE && (
        <p className="mb-1 text-xs text-neutral-600">
          {TRONCATURE} premières sur {cassees.length}.
        </p>
      )}
      <TableauEnveloppe legende="Pages qui ne répondent pas en statut 200">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" className="px-3 py-2">
              Chemin
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Statut
            </th>
            <th scope="col" className="px-3 py-2">
              Canonical
            </th>
          </tr>
        </thead>
        <tbody>
          {cassees.slice(0, TRONCATURE).map((p) => (
            <tr key={p.url} className="border-t border-neutral-100">
              <td className="px-3 py-2 break-words text-neutral-800">{chemin(p.url)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                {formatNombre(p.statut)}
              </td>
              <td className="px-3 py-2 break-words text-neutral-700">
                {p.canonical ? chemin(p.canonical) : 'indisponible'}
              </td>
            </tr>
          ))}
        </tbody>
      </TableauEnveloppe>
    </div>
  );
}

function SectionSante({ crawl }: { crawl: Bloc<CrawlDonnees> }) {
  const donnees = crawl.status === 'ok' ? crawl.donnees : null;
  const pagesPassees = donnees ? valeurPagesPassees(donnees.pages) : null;
  const synthese = donnees ? syntheseAnomaliesCrawl(donnees) : null;
  const fenetreTexte = formatFenetreLongue(crawl.fenetre);
  return (
    <section className="mb-10" aria-labelledby="titre-sante">
      <h2 id="titre-sante" className="mb-1 text-xl font-semibold text-neutral-900">
        Santé technique
      </h2>
      {fenetreTexte && <p className="mb-3 text-sm text-neutral-600">{fenetreTexte}</p>}
      {!donnees && (
        <p className="text-sm text-neutral-600">
          indisponible : le passage technique n&apos;est pas à jour.
        </p>
      )}
      {synthese?.aucuneAnomalie && <p className="text-sm text-neutral-700">{synthese.phrase}</p>}
      {donnees && pagesPassees && !synthese?.aucuneAnomalie && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Pages passées" value={pagesPassees.texte} alarme={pagesPassees.alarme} />
          {synthese?.items.map((item) => (
            <Stat key={item.label} label={item.label} value={item.valeur} alarme={item.alarme} />
          ))}
        </dl>
      )}
      {donnees?.pages && <TablePagesCassees pages={donnees.pages} />}
    </section>
  );
}

// --- Annexes ------------------------------------------------------------

function Annexe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <details className="mb-3 rounded border border-neutral-200 bg-neutral-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-neutral-900">{titre}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function ChiffresGsc({ bloc, freshness }: { bloc: Bloc<GscDonnees>; freshness: Freshness | null }) {
  const donnees = bloc.donnees;
  const totauxAffiches = donnees?.totauxBelgique ??
    donnees?.totaux ?? {
      clics: null,
      impressions: null,
      ctr: null,
      position: null,
    };
  const perimetre = donnees?.totauxBelgique ? 'depuis la Belgique' : 'le monde entier';
  return (
    <div className="mb-8">
      <TitreSection titre="Search Console" fenetre={bloc.fenetre} />
      <MetaBloc bloc={bloc} freshness={freshness} avecFinDonnees />
      {donnees && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat
              label="Clics Belgique, 28 jours précédents"
              value={formatNombre(donnees.clicsBelgiquePrecedents)}
            />
            <Stat
              label="Clics totaux (le monde entier)"
              value={formatNombre(donnees.totaux.clics)}
            />
            {/* Impressions, taux de clic et position : version belge quand la
                collecte la transmet (GSC 4), sinon les totaux mondiaux, et le
                libellé dit toujours lequel des deux est affiché. */}
            <Stat
              label={`Impressions (${perimetre})`}
              value={formatNombre(totauxAffiches.impressions)}
            />
            <Stat
              label={`Taux de clic (${perimetre})`}
              value={formatPourcentFraction(totauxAffiches.ctr)}
            />
            <Stat
              label={`Position moyenne dans Google (${perimetre})`}
              value={formatDecimal(totauxAffiches.position)}
            />
          </dl>
          <ul className="mt-3 space-y-1.5 text-xs text-neutral-600">
            <li>
              Clics totaux : le monde entier ; l&apos;écart avec les clics depuis la Belgique est
              surtout du bruit international, sans lecteur réel derrière.
            </li>
            <li>
              Position moyenne dans Google : le rang moyen des pages du site quand elles
              apparaissent dans les résultats, 1 étant la première place
              {totauxAffiches.position !== null
                ? ` ; ${formatDecimal(totauxAffiches.position)} correspond à ${lireRang(totauxAffiches.position)} en moyenne`
                : ''}
              .
            </li>
            <li>Taux de clic : la part des affichages dans les résultats qui ont donné un clic.</li>
          </ul>
        </>
      )}
    </div>
  );
}

function ChiffresUmami({
  bloc,
  freshness,
}: {
  bloc: Bloc<UmamiDonnees>;
  freshness: Freshness | null;
}) {
  const donnees = bloc.donnees;
  return (
    <div className="mb-8">
      <TitreSection titre="Umami" fenetre={bloc.fenetre} />
      <MetaBloc bloc={bloc} freshness={freshness} avecFinDonnees />
      {donnees && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat
              label="Visites ayant vu au moins deux pages"
              value={formatPourcentFraction(donnees.profondeur)}
            />
            {donnees.inscriptions === null && (
              <Stat label="Événements (tous types)" value={formatNombre(donnees.evenements)} />
            )}
          </dl>
          <ul className="mt-3 space-y-1.5 text-xs text-neutral-600">
            <li>
              Visites ayant vu au moins deux pages : un lecteur arrivé sur le site puis reparti
              aussitôt n&apos;y est pas compté.
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

function ChiffresCrawl({
  bloc,
  freshness,
}: {
  bloc: Bloc<CrawlDonnees>;
  freshness: Freshness | null;
}) {
  return (
    <div className="mb-2">
      <TitreSection titre="Passage technique" fenetre={bloc.fenetre} />
      <MetaBloc bloc={bloc} freshness={freshness} />
    </div>
  );
}

function AnnexeRequetes({ bloc }: { bloc: Bloc<GscDonnees> }) {
  const donnees = bloc.status === 'ok' ? bloc.donnees : null;
  if (!donnees) return <p className="text-sm text-neutral-600">indisponible.</p>;
  if (donnees.requetes.length === 0)
    return <p className="text-sm text-neutral-600">Aucune requête transmise.</p>;
  return (
    <>
      <p className="mb-1 text-xs text-neutral-600">
        {donnees.requetesBelgique ? 'Depuis la Belgique' : 'Le monde entier'}. Liste couvrant
        environ {formatPourcentFraction(donnees.partRequetes)} des clics seulement : Search Console
        anonymise les requêtes rares, cette liste n&apos;est donc pas exhaustive.
      </p>
      <TableauEnveloppe
        legende={`Requêtes les plus cliquées ${donnees.requetesBelgique ? 'depuis la Belgique' : '(le monde entier)'}, Search Console`}
      >
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
            <th scope="col" className="px-3 py-2">
              Requête
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Clics
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Impressions
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Position
            </th>
          </tr>
        </thead>
        <tbody>
          {donnees.requetes.slice(0, 10).map((r) => (
            <tr key={r.requete} className="border-t border-neutral-100">
              <td className="px-3 py-2 text-neutral-800">{r.requete}</td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                {formatNombre(r.clics)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                {formatNombre(r.impressions)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                {formatDecimal(r.position)}
              </td>
            </tr>
          ))}
        </tbody>
      </TableauEnveloppe>
    </>
  );
}

function AnnexePagesEntree({ donnees }: { donnees: UmamiDonnees | null }) {
  if (!donnees) return <p className="text-sm text-neutral-600">indisponible.</p>;
  if (donnees.pagesEntree.length === 0)
    return <p className="text-sm text-neutral-600">Aucune page d&apos;entrée transmise.</p>;
  return (
    <TableauEnveloppe legende="Pages d'entrée les plus visitées, dont les visites venues d'assistants">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
          <th scope="col" className="px-3 py-2">
            Chemin
          </th>
          <th scope="col" className="px-3 py-2 text-right">
            Visites
          </th>
          <th scope="col" className="px-3 py-2 text-right">
            Dont assistants
          </th>
        </tr>
      </thead>
      <tbody>
        {donnees.pagesEntree.slice(0, 10).map((p) => (
          <tr key={p.chemin} className="border-t border-neutral-100">
            <td className="px-3 py-2 break-words text-neutral-800">{p.chemin}</td>
            <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
              {formatNombre(p.visites)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
              {formatNombre(p.visitesIa)}
            </td>
          </tr>
        ))}
      </tbody>
    </TableauEnveloppe>
  );
}

function AnnexeEvenements({ donnees }: { donnees: UmamiDonnees | null }) {
  if (!donnees || donnees.evenementsParNom === null)
    return <p className="text-sm text-neutral-600">indisponible dans ce relevé.</p>;
  if (donnees.evenementsParNom.length === 0)
    return <p className="text-sm text-neutral-600">Aucun événement sur la période.</p>;
  return (
    <TableauEnveloppe legende="Événements Umami par nom, avec le nombre de visites concernées">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
          <th scope="col" className="px-3 py-2">
            Événement
          </th>
          <th scope="col" className="px-3 py-2 text-right">
            Total
          </th>
          <th scope="col" className="px-3 py-2 text-right">
            Visites
          </th>
        </tr>
      </thead>
      <tbody>
        {donnees.evenementsParNom.slice(0, 15).map((e) => (
          <tr key={e.nom} className="border-t border-neutral-100">
            <td className="px-3 py-2 break-words text-neutral-800">{e.nom}</td>
            <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
              {formatNombre(e.total)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
              {formatNombre(e.visites)}
            </td>
          </tr>
        ))}
      </tbody>
    </TableauEnveloppe>
  );
}

function AnnexeInscrits({ donnees }: { donnees: UmamiDonnees | null }) {
  if (!donnees || donnees.inscriptions === null)
    return <p className="text-sm text-neutral-600">indisponible dans ce relevé.</p>;
  if (donnees.inscriptions.parPageEntree.length === 0)
    return <p className="text-sm text-neutral-600">Aucune inscription sur la période.</p>;
  return (
    <TableauEnveloppe legende="Pages d'entrée des visites ayant envoyé une inscription">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
          <th scope="col" className="px-3 py-2">
            Page d&apos;entrée
          </th>
          <th scope="col" className="px-3 py-2 text-right">
            Visites
          </th>
        </tr>
      </thead>
      <tbody>
        {donnees.inscriptions.parPageEntree.slice(0, 10).map((p) => (
          <tr key={p.chemin} className="border-t border-neutral-100">
            <td className="px-3 py-2 break-words text-neutral-800">{p.chemin}</td>
            <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
              {formatNombre(p.visites)}
            </td>
          </tr>
        ))}
      </tbody>
    </TableauEnveloppe>
  );
}

/** Une seule empreinte attendue (voir COMMANDE_EMPREINTE). Si les blocs en
 * portent plusieurs, c'est qu'ils ne viennent pas du même passage (un fichier
 * resté d'une version précédente) : on le dit, bloc par bloc, au lieu de
 * n'en montrer qu'une. */
function SectionEmpreinte({ blocs }: { blocs: { nom: string; sha: string | null }[] }) {
  const connues = blocs.filter((b) => b.sha !== null);
  const distinctes = new Set(connues.map((b) => b.sha));
  return (
    <>
      <p className="mb-3 text-sm text-neutral-600">
        La CI ne déploie pas <code className="text-xs">deploy/</code> de bgm-ops : la machine peut
        exécuter une autre version que le dépôt. Une seule empreinte couvre toute la collecte ; elle
        doit être égale à la sortie de cette commande, lancée depuis une copie de bgm-ops à jour.
      </p>
      {connues.length === 0 && <p className="text-sm text-neutral-600">Empreinte indisponible.</p>}
      {distinctes.size === 1 && (
        <p className="text-sm text-neutral-900">
          <EmpreinteScript sha={connues[0].sha} />
        </p>
      )}
      {distinctes.size > 1 && (
        <>
          <p className="mb-2 text-sm text-warning-fg">
            Les blocs ne portent pas la même empreinte : ils ne viennent pas du même passage.
          </p>
          <dl className="grid gap-3 sm:grid-cols-3">
            {connues.map((b) => (
              <div key={b.nom} className="rounded border border-neutral-200 bg-neutral-50 p-3">
                <dt className="text-xs uppercase tracking-wide text-neutral-500">{b.nom}</dt>
                <dd className="mt-1 text-sm text-neutral-900">
                  <EmpreinteScript sha={b.sha} />
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <pre className="mt-3 overflow-x-auto rounded border border-neutral-200 bg-neutral-50 p-3 text-xs">
        <code>{COMMANDE_EMPREINTE}</code>
      </pre>
    </>
  );
}

function FenetresAnalyse({ rapport }: { rapport: RapportSeo }) {
  const { gsc, umami, crawl } = rapport.blocs;
  return (
    <>
      <p className="mb-3 text-sm text-neutral-600">
        Chaque bloc analyse sa propre période, listée ici pour vérifier le relevé.
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">{NOMS_BLOCS.gsc}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">
            {formatFenetre(gsc.fenetre, NOMS_BLOCS.gsc)}
          </dd>
        </div>
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">{NOMS_BLOCS.umami}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">
            {formatFenetre(umami.fenetre, NOMS_BLOCS.umami)}
          </dd>
        </div>
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">{NOMS_BLOCS.crawl}</dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">
            {formatFenetre(crawl.fenetre, NOMS_BLOCS.crawl)}
          </dd>
        </div>
      </dl>
    </>
  );
}

/** Ce qui sert à vérifier le relevé, pas à décider : en dernier, chaque
 * annexe repliée dans un <details>. */
function SectionAnnexes({ rapport }: { rapport: RapportSeo }) {
  const { gsc, umami, crawl } = rapport.blocs;
  const u = umami.status === 'ok' ? umami.donnees : null;
  return (
    <section className="mb-10" aria-labelledby="titre-annexes">
      <h2 id="titre-annexes" className="mb-3 text-xl font-semibold text-neutral-900">
        Annexes
      </h2>
      <Annexe titre="Chiffres détaillés par source">
        <ChiffresGsc bloc={gsc} freshness={rapport.fraicheur.gsc} />
        <ChiffresUmami bloc={umami} freshness={rapport.fraicheur.umami} />
        <ChiffresCrawl bloc={crawl} freshness={rapport.fraicheur.crawl} />
      </Annexe>
      <Annexe titre="Requêtes les plus cliquées">
        <AnnexeRequetes bloc={gsc} />
      </Annexe>
      <Annexe titre="Pages d'entrée">
        <AnnexePagesEntree donnees={u} />
      </Annexe>
      <Annexe titre="Événements par nom">
        <AnnexeEvenements donnees={u} />
      </Annexe>
      <Annexe titre="Pages d'entrée des inscrits">
        <AnnexeInscrits donnees={u} />
      </Annexe>
      <Annexe titre="Fenêtres d'analyse">
        <FenetresAnalyse rapport={rapport} />
      </Annexe>
      <Annexe titre="Empreinte de la collecte">
        <SectionEmpreinte
          blocs={[
            { nom: NOMS_BLOCS.gsc, sha: gsc.scriptSha256 },
            { nom: NOMS_BLOCS.umami, sha: umami.scriptSha256 },
            { nom: NOMS_BLOCS.crawl, sha: crawl.scriptSha256 },
          ]}
        />
      </Annexe>
    </section>
  );
}

export default async function AdminRapportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale);

  const rapport: RapportSeo = await readSeoReport();
  const { gsc, umami, crawl } = rapport.blocs;

  return (
    // Pas de <main> ici : la page est déjà dans le <main id="main-content">
    // du layout de locale, et deux repères principaux imbriqués trompent les
    // lecteurs d'écran.
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">Admin</p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">Audience et santé du site</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Trois relevés indépendants, déposés chaque matin par un travail planifié sur le VPS. Une
          panne sur l&apos;un n&apos;empêche jamais l&apos;affichage des autres.
        </p>
        <ul aria-label="État des sources" className="mt-3 space-y-0.5 text-sm">
          <LigneEtatSource
            nom={NOMS_BLOCS.gsc}
            bloc={gsc}
            freshness={rapport.fraicheur.gsc}
            libelleDate="données jusqu'au"
          />
          <LigneEtatSource
            nom={NOMS_BLOCS.umami}
            bloc={umami}
            freshness={rapport.fraicheur.umami}
            libelleDate="données jusqu'au"
          />
          <LigneEtatSource
            nom="Passage technique"
            bloc={crawl}
            freshness={rapport.fraicheur.crawl}
            libelleDate="contrôle du"
          />
        </ul>
      </header>

      <EtatBloc nom={NOMS_BLOCS.gsc} bloc={gsc} />
      <EtatBloc nom={NOMS_BLOCS.umami} bloc={umami} />
      <EtatBloc nom={NOMS_BLOCS.crawl} bloc={crawl} />

      <SectionEnBref rapport={rapport} />
      <SectionEssentiel gsc={gsc} umami={umami} serie={rapport.serie ?? null} />
      <SectionAFaire bloc={gsc} />
      <SectionMouvements gsc={gsc} />
      <SectionSources umami={umami} />
      <SectionLangues gsc={gsc} umami={umami} />
      <SectionPublications gsc={gsc} />
      <SectionSante crawl={crawl} />
      <SectionAnnexes rapport={rapport} />
    </div>
  );
}
