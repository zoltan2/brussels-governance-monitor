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
  type RapportSeo,
  type StatutBloc,
  type UmamiDonnees,
} from '@/lib/seo-report';
import { freshnessClassName, pireFraicheurNommee, type Freshness } from '@/lib/snapshot-freshness';
import { chemin } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admin — Rapport SEO hebdomadaire',
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

const SCRIPTS_BLOCS: Record<keyof RapportSeo['blocs'], string> = {
  gsc: 'bloc-gsc.mjs',
  umami: 'bloc-umami.mjs',
  crawl: 'bloc-crawl.mjs',
};

// Ordre de grandeur du sitemap (tâches 4-5) : repère pour juger une
// couverture anormalement faible, pas une mesure exacte à comparer au
// chiffre près.
const URLS_SITEMAP_ATTENDUES = 630;
const COUVERTURE_MINIMALE = 0.5;

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
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
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

function formatDateLongue(date: DateSeule, avecAnnee: boolean): string {
  const base = `${date.jour} ${MOIS_FR[date.mois - 1]}`;
  return avecAnnee ? `${base} ${date.annee}` : base;
}

/** Fenêtre en dates lisibles, à côté des chiffres qu'elle date : « 28 jours,
 * du 21 août au 17 septembre 2026 ». Contrairement à formatFenetre (utilisée
 * dans « À propos de ce relevé » pour la vérification), aucun repli textuel
 * n'est rendu quand la fenêtre est indisponible : la ligne reste tue, une
 * période inconnue ne s'affiche pas comme si elle valait la peine d'être lue
 * à côté des chiffres. */
function formatFenetreLongue(fenetre: FenetreRapport | null): string | null {
  const debut = parseDateSeule(fenetre?.debut ?? null);
  const fin = parseDateSeule(fenetre?.fin ?? null);
  if (!debut || !fin) return null;
  const jours = joursInclusifs(debut, fin);
  const memeAnnee = debut.annee === fin.annee;
  const texteDebut = formatDateLongue(debut, !memeAnnee);
  const texteFin = formatDateLongue(fin, true);
  const prefixe = jours !== null ? `${jours} jours, ` : '';
  return `${prefixe}du ${texteDebut} au ${texteFin}`;
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
  return pages.length < URLS_SITEMAP_ATTENDUES * COUVERTURE_MINIMALE;
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
  const total = toutesConnues
    ? categories.reduce((acc, c) => acc + (c.n as number), 0)
    : null;
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
      className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {nom} : {LIBELLES_STATUT[bloc.status]}
      {bloc.message ? ` (${bloc.message})` : ''}. Les autres blocs restent
      affichés ci-dessous quand ils sont à jour.
    </p>
  );
}

function VerdictFraicheur({ freshness }: { freshness: Freshness | null }) {
  if (!freshness) return <span className="text-neutral-500">fraîcheur indisponible</span>;
  const classe =
    freshness.level === 'fresh' ? 'text-neutral-500' : 'font-medium text-amber-700';
  return <span className={classe}>{freshness.label}</span>;
}

/** Sonde et fraîcheur, l'une à côté de l'autre : une sonde réussie sur un
 * relevé vieux de dix jours doit le dire ici, pas seulement dans un verdict
 * global en haut de page. L'empreinte du script n'est plus ici : voir
 * « À propos de ce relevé ». */
function MetaBloc({ bloc, freshness }: { bloc: Bloc<unknown>; freshness: Freshness | null }) {
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
    </p>
  );
}

function Stat({
  label,
  value,
  alarme = false,
}: {
  label: string;
  value: string;
  alarme?: boolean;
}) {
  return (
    <div
      className={
        alarme
          ? 'rounded border border-amber-300 bg-amber-50 p-3'
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
            ? 'mt-1 break-all text-lg font-semibold tabular-nums text-amber-900'
            : 'mt-1 break-all text-lg font-semibold tabular-nums text-neutral-900'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function TableauEnveloppe({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-sm">{children}</table>
    </div>
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
 * Actions suggérées : première section de la page, ancrée pour la tuile
 * (#actions). Un bloc GSC « ok » mais sans la moindre mesure exploitable
 * n'est pas traité comme « aucune action cette semaine » : c'est un payload
 * suspect, indisponible comme une panne.
 */
function SectionActions({ bloc }: { bloc: Bloc<GscDonnees> }) {
  const utilisable = bloc.status === 'ok' && !!bloc.donnees && gscMesurePresente(bloc.donnees);
  const actions = utilisable ? (bloc.donnees?.actions ?? []) : null;
  return (
    <section id="actions" className="mb-10 scroll-mt-4">
      <h2 className="mb-3 text-xl font-semibold text-neutral-900">Actions suggérées</h2>
      {actions === null && (
        <p className="text-sm text-neutral-600">
          indisponible : le bloc Search Console qui les calcule n&apos;est pas à
          jour ou n&apos;a transmis aucune mesure exploitable cette semaine
          (voir Chiffres clés ci-dessous).
        </p>
      )}
      {actions !== null && actions.length === 0 && (
        <p className="text-sm text-neutral-600">Aucune action cette semaine.</p>
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
            const fenetreTexte = action.fenetre?.debut || action.fenetre?.fin
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
                  {action.priorite !== null ? ` · priorité ${action.priorite}` : ' · priorité indisponible'}
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
    </section>
  );
}

/** Titre + fenêtre lisible, répétés à l'identique en tête des trois sections
 * de chiffres clés : la période se lit à côté des chiffres qu'elle date,
 * pas seulement tout en bas de page dans « À propos de ce relevé ». */
function TitreSection({ titre, fenetre }: { titre: string; fenetre: FenetreRapport | null }) {
  const fenetreTexte = formatFenetreLongue(fenetre);
  return (
    <>
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">{titre}</h3>
      {fenetreTexte && <p className="mb-3 text-sm text-neutral-600">{fenetreTexte}</p>}
    </>
  );
}

function ChiffresGsc({ bloc, freshness }: { bloc: Bloc<GscDonnees>; freshness: Freshness | null }) {
  const donnees = bloc.donnees;
  const fenetrePrecedenteTexte = formatFenetrePrecedente(bloc.fenetre);
  return (
    <div className="mb-8">
      <TitreSection titre="Search Console" fenetre={bloc.fenetre} />
      <EtatBloc nom={NOMS_BLOCS.gsc} bloc={bloc} />
      <MetaBloc bloc={bloc} freshness={freshness} />
      {donnees && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Clics depuis la Belgique" value={formatNombre(donnees.clicsBelgique)} />
            <Stat
              label="Clics Belgique, 28 jours précédents"
              value={formatNombre(donnees.clicsBelgiquePrecedents)}
            />
            <Stat label="Clics totaux (le monde entier)" value={formatNombre(donnees.totaux.clics)} />
            <Stat label="Impressions" value={formatNombre(donnees.totaux.impressions)} />
            <Stat label="Taux de clic" value={formatPourcentFraction(donnees.totaux.ctr)} />
            <Stat
              label="Position moyenne dans Google"
              value={formatDecimal(donnees.totaux.position)}
            />
          </dl>
          <ul className="mt-3 space-y-1.5 text-xs text-neutral-600">
            <li>
              Clics depuis la Belgique : les clics venus de Belgique sur cette période. Les
              clics totaux comptent le monde entier ; l&apos;écart entre les deux est surtout
              du bruit international, sans lecteur réel derrière.
            </li>
            <li>
              Clics Belgique, 28 jours précédents : la période de comparaison
              {fenetrePrecedenteTexte ? ` (${fenetrePrecedenteTexte})` : ''}.
            </li>
            <li>
              Position moyenne dans Google : le rang moyen des pages du site quand elles
              apparaissent dans les résultats, 1 étant la première place. Une valeur de 6,6
              signifie sixième ou septième position en moyenne.
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
      <EtatBloc nom={NOMS_BLOCS.umami} bloc={bloc} />
      <MetaBloc bloc={bloc} freshness={freshness} />
      {donnees && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Visites" value={formatNombre(donnees.visites)} />
            <Stat
              label="Visites ayant vu au moins deux pages"
              value={formatPourcentFraction(donnees.profondeur)}
            />
            <Stat label="Événements" value={formatNombre(donnees.evenements)} />
          </dl>
          <p className="mt-3 text-xs text-neutral-600">
            Visites ayant vu au moins deux pages : un lecteur arrivé sur le site puis reparti
            aussitôt n&apos;y est pas compté.
          </p>
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
  const donnees = bloc.donnees;
  const pagesPassees = donnees ? valeurPagesPassees(donnees.pages) : null;
  const synthese = donnees ? syntheseAnomaliesCrawl(donnees) : null;
  return (
    <div className="mb-8">
      <TitreSection titre="Passage technique" fenetre={bloc.fenetre} />
      <EtatBloc nom={NOMS_BLOCS.crawl} bloc={bloc} />
      <MetaBloc bloc={bloc} freshness={freshness} />
      {donnees && pagesPassees && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Pages passées"
            value={pagesPassees.texte}
            alarme={pagesPassees.alarme}
          />
        </dl>
      )}
      {synthese &&
        (synthese.aucuneAnomalie ? (
          <p className="mt-3 text-sm text-neutral-700">{synthese.phrase}</p>
        ) : (
          synthese.items.length > 0 && (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {synthese.items.map((item) => (
                <Stat
                  key={item.label}
                  label={item.label}
                  value={item.valeur}
                  alarme={item.alarme}
                />
              ))}
            </dl>
          )
        ))}
    </div>
  );
}

function TablesGsc({ bloc }: { bloc: Bloc<GscDonnees> }) {
  const donnees = bloc.donnees;
  if (!donnees) return null;
  return (
    <div className="mb-8">
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">Search Console</h3>
      {donnees.requetes.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-sm font-semibold text-neutral-900">
            Requêtes les plus cliquées
          </h4>
          <p className="mb-1 text-xs text-neutral-500">
            Liste couvrant environ {formatPourcentFraction(donnees.partRequetes)} des
            clics seulement : Search Console anonymise les requêtes rares, cette
            liste n&apos;est donc pas exhaustive.
          </p>
          <TableauEnveloppe>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Requête</th>
                <th className="px-3 py-2 text-right">Clics</th>
                <th className="px-3 py-2 text-right">Impressions</th>
                <th className="px-3 py-2 text-right">Position</th>
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
        </div>
      )}

      {donnees.pages.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-sm font-semibold text-neutral-900">
            Pages les plus cliquées
          </h4>
          <TableauEnveloppe>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Chemin</th>
                <th className="px-3 py-2 text-right">Clics</th>
                <th className="px-3 py-2 text-right">28 jours précédents</th>
              </tr>
            </thead>
            <tbody>
              {donnees.pages.slice(0, 10).map((p) => (
                <tr key={p.url} className="border-t border-neutral-100">
                  <td className="px-3 py-2 break-words text-neutral-800">{chemin(p.url)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                    {formatNombre(p.clics)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                    {formatNombre(p.clicsPrecedents)}
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

function TablesUmami({ bloc }: { bloc: Bloc<UmamiDonnees> }) {
  const donnees = bloc.donnees;
  const visitesIa = donnees?.visitesIa ?? [];
  if (!donnees) return null;
  return (
    <div className="mb-8">
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">Umami</h3>
      {donnees.visitesIa !== null && donnees.visitesIa.length === 0 && (
        <p className="mt-2 text-sm text-neutral-600">Aucune visite d&apos;assistant cette semaine.</p>
      )}
      {visitesIa.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-sm font-semibold text-neutral-900">
            Visites d&apos;assistants, par source
          </h4>
          <TableauEnveloppe>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2 text-right">Visites</th>
              </tr>
            </thead>
            <tbody>
              {visitesIa.map((v) => (
                <tr key={v.source} className="border-t border-neutral-100">
                  <td className="px-3 py-2 text-neutral-800">{v.source}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-700">
                    {formatNombre(v.visites)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableauEnveloppe>
        </div>
      )}

      {donnees.pagesEntree.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-sm font-semibold text-neutral-900">
            Pages d&apos;entrée les plus visitées
          </h4>
          <TableauEnveloppe>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Chemin</th>
                <th className="px-3 py-2 text-right">Visites</th>
                <th className="px-3 py-2 text-right">Dont assistants</th>
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
        </div>
      )}
    </div>
  );
}

function TablesCrawl({ bloc }: { bloc: Bloc<CrawlDonnees> }) {
  const donnees = bloc.donnees;
  const pages = donnees?.pages ?? [];
  if (!donnees) return null;
  // pagesCassees() exclut les pages au statut inconnu (null) : une page
  // jamais contrôlée n'est pas prouvée cassée, elle est comptée à part
  // (Stat « Pages au statut inconnu » dans Chiffres clés).
  const cassees = pagesCassees(pages);
  const TRONCATURE = 20;
  return (
    <div className="mb-8">
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">Passage technique</h3>
      {cassees.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-sm font-semibold text-neutral-900">
            Pages sans statut 200
          </h4>
          {cassees.length > TRONCATURE && (
            <p className="mb-1 text-xs text-neutral-500">
              {TRONCATURE} premières sur {cassees.length}.
            </p>
          )}
          <TableauEnveloppe>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Chemin</th>
                <th className="px-3 py-2 text-right">Statut</th>
                <th className="px-3 py-2">Canonical</th>
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
      )}
    </div>
  );
}

/** Les deux fenêtres coïncident quand elles couvrent le même jour calendaire
 * de début et de fin (les fuseaux, eux, restent différents : Pacifique pour
 * Search Console, UTC pour Umami). Sert à décider si le rapprochement des
 * deux blocs reste valable cette semaine. */
function fenetresAlignees(a: FenetreRapport | null, b: FenetreRapport | null): boolean {
  if (!a?.debut || !a?.fin || !b?.debut || !b?.fin) return false;
  return a.debut.slice(0, 10) === b.debut.slice(0, 10) && a.fin.slice(0, 10) === b.fin.slice(0, 10);
}

/**
 * Un lecteur pressé, le lundi matin, doit savoir d'un coup d'œil s'il peut
 * rapprocher les chiffres Search Console et Umami : cette phrase vit donc en
 * tête de « Chiffres clés », avant le premier chiffre, pas en bas de page
 * dans « À propos de ce relevé ». Quand les fenêtres coïncident, une seule
 * phrase l'autorise, suivie des deux réserves qui restent vraies même dans
 * ce cas (retard de Search Console, décalage de fuseau) ; quand elles ne
 * coïncident pas (collecte partielle, panne d'un bloc), l'avertissement
 * ambre le dit aussi nettement, jamais à la seule couleur : le texte porte
 * l'interdiction, la couleur ne fait que la souligner.
 */
function SyntheseFenetresComparaison({
  gsc,
  umami,
}: {
  gsc: FenetreRapport | null;
  umami: FenetreRapport | null;
}) {
  if (fenetresAlignees(gsc, umami)) {
    return (
      <p className="mb-4 text-sm text-neutral-700">
        Search Console et Umami couvrent les mêmes 28 jours : vous pouvez rapprocher leurs
        chiffres. Search Console publie ses données avec environ trois jours de retard, sa
        fenêtre s&apos;arrête donc trois jours avant aujourd&apos;hui. Les deux outils
        découpent leurs journées dans des fuseaux différents, ce qui laisse quelques heures
        d&apos;écart aux bords de la période.
      </p>
    );
  }
  return (
    <p
      role="alert"
      className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      Cette semaine, les fenêtres de Search Console et d&apos;Umami ne coïncident pas : ne
      rapprochez pas leurs chiffres.
    </p>
  );
}

/** Fenêtres et empreintes de script : utiles pour vérifier le relevé, pas
 * pour décider quoi faire cette semaine — donc en dernier, jamais avant les
 * actions ou les chiffres. */
function SectionAPropos({ rapport }: { rapport: RapportSeo }) {
  const { gsc, umami, crawl } = rapport.blocs;
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold text-neutral-900">
        À propos de ce relevé
      </h2>

      <h3 className="mb-1 text-sm font-semibold text-neutral-900">
        Fenêtres d&apos;analyse
      </h3>
      <p className="mb-3 text-sm text-neutral-600">
        Chaque bloc analyse sa propre période, listée ci-dessous pour vérifier
        le relevé. Le rapprochement entre Search Console et Umami est expliqué
        en tête de la section Chiffres clés, juste au-dessus des chiffres.
      </p>
      <dl className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            {NOMS_BLOCS.gsc}
          </dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">
            {formatFenetre(gsc.fenetre, NOMS_BLOCS.gsc)}
          </dd>
        </div>
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            {NOMS_BLOCS.umami}
          </dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">
            {formatFenetre(umami.fenetre, NOMS_BLOCS.umami)}
          </dd>
        </div>
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            {NOMS_BLOCS.crawl}
          </dt>
          <dd className="mt-1 text-sm font-medium text-neutral-900">
            {formatFenetre(crawl.fenetre, NOMS_BLOCS.crawl)}
          </dd>
        </div>
      </dl>

      <h3 className="mb-1 text-sm font-semibold text-neutral-900">
        Empreintes des scripts
      </h3>
      <p className="mb-3 text-sm text-neutral-600">
        Le dépôt et la machine de production peuvent diverger, la CI ne
        déployant pas <code className="text-xs">deploy/</code> : comparez
        avec la commande donnée pour repérer un écart.
      </p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['gsc', gsc] as const,
            ['umami', umami] as const,
            ['crawl', crawl] as const,
          ]
        ).map(([cle, bloc]) => (
          <div key={cle} className="rounded border border-neutral-200 bg-neutral-50 p-3">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">
              {NOMS_BLOCS[cle]}
            </dt>
            <dd className="mt-1 text-sm text-neutral-900">
              <EmpreinteScript sha={bloc.scriptSha256} />
              <p className="mt-1 text-xs text-neutral-500">
                Valeur attendue :{' '}
                <code className="text-xs">
                  sha256sum deploy/seo-report/{SCRIPTS_BLOCS[cle]}
                </code>{' '}
                sur le dépôt.
              </p>
            </dd>
          </div>
        ))}
      </dl>
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

  // Un seul verdict, sous le h1, avant le premier chiffre : sur téléphone,
  // un retard annoncé seulement en pied de page, après trois sections et
  // quatre tableaux, n'est vu par personne. Nomme le bloc fautif : sans
  // cela, une horloge incohérente se confond avec le bloc suivant.
  const fraicheurGlobale = pireFraicheurNommee([
    { nom: NOMS_BLOCS.gsc, freshness: rapport.fraicheur.gsc },
    { nom: NOMS_BLOCS.umami, freshness: rapport.fraicheur.umami },
    { nom: NOMS_BLOCS.crawl, freshness: rapport.fraicheur.crawl },
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-4">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900">
          Rapport SEO hebdomadaire
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-600">
          Trois relevés indépendants (Search Console, Umami, passage technique),
          déposés une fois par semaine par un travail planifié sur le VPS. Une
          panne sur l&apos;un n&apos;empêche jamais l&apos;affichage des autres.
        </p>
      </header>

      {fraicheurGlobale ? (
        <p className={`${freshnessClassName(fraicheurGlobale.freshness.level)} mt-0 mb-8`}>
          {fraicheurGlobale.nom} : {fraicheurGlobale.freshness.label}
        </p>
      ) : (
        <p className="mb-8 text-xs text-neutral-500">Fraîcheur indisponible pour les trois blocs.</p>
      )}

      <SectionActions bloc={gsc} />

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Chiffres clés</h2>
        <SyntheseFenetresComparaison gsc={gsc.fenetre} umami={umami.fenetre} />
        <ChiffresGsc bloc={gsc} freshness={rapport.fraicheur.gsc} />
        <ChiffresUmami bloc={umami} freshness={rapport.fraicheur.umami} />
        <ChiffresCrawl bloc={crawl} freshness={rapport.fraicheur.crawl} />
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Détails</h2>
        <TablesGsc bloc={gsc} />
        <TablesUmami bloc={umami} />
        <TablesCrawl bloc={crawl} />
      </section>

      <SectionAPropos rapport={rapport} />
    </main>
  );
}
