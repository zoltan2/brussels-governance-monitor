// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/require-admin';
import {
  readSeoReport,
  gscMesurePresente,
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

function formatFenetre(fenetre: FenetreRapport | null, nomBloc: string): string {
  if (!fenetre || (!fenetre.debut && !fenetre.fin)) return 'fenêtre indisponible';
  const debut = formatDateSeule(fenetre.debut);
  const fin = formatDateSeule(fenetre.fin);
  return `${debut} → ${fin} (${nommerFuseau(fenetre.fuseau, nomBloc)})`;
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

/** null = liste de pages manquante : indisponible. Sinon, compte les pages
 * qui n'ont pas le champ demandé — 0 s'écrit « aucune », jamais un zéro nu,
 * pour ne jamais se confondre avec une donnée non affichée. */
function compterManquants(pages: PageCrawl[] | null, manque: (p: PageCrawl) => boolean): string {
  if (pages === null) return 'indisponible';
  const n = pages.filter(manque).length;
  return n === 0 ? 'aucune' : n.toLocaleString('fr-BE');
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
        className={
          alarme
            ? 'mt-1 text-lg font-semibold tabular-nums text-amber-900'
            : 'mt-1 text-lg font-semibold tabular-nums text-neutral-900'
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
          {actions.map((action, i) => (
            <li
              key={`${action.regle}-${action.url}-${i}`}
              className="rounded border border-neutral-200 bg-neutral-50 p-4"
            >
              <p className="text-sm font-semibold break-words text-neutral-900">
                {action.titre ?? `${action.regle} : ${chemin(action.url)}`}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Règle : {action.regle}
                {action.priorite !== null ? ` · priorité ${action.priorite}` : ' · priorité indisponible'}
              </p>
              <p className="mt-2 text-sm text-neutral-700">{action.preuve}</p>
              <p className="mt-2 text-sm">
                <a
                  href={action.url}
                  className="break-words text-brand-700 underline-offset-4 hover:underline"
                >
                  {chemin(action.url)}
                </a>
              </p>
              {action.fenetre && (
                <p className="mt-2 text-xs text-neutral-500">
                  Fenêtre : {formatFenetre(action.fenetre, 'Search Console')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChiffresGsc({ bloc, freshness }: { bloc: Bloc<GscDonnees>; freshness: Freshness | null }) {
  const donnees = bloc.donnees;
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-lg font-semibold text-neutral-900">Search Console</h3>
      <EtatBloc nom={NOMS_BLOCS.gsc} bloc={bloc} />
      <MetaBloc bloc={bloc} freshness={freshness} />
      {donnees && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Clics Belgique" value={formatNombre(donnees.clicsBelgique)} />
          <Stat
            label="Clics Belgique, semaine précédente"
            value={formatNombre(donnees.clicsBelgiquePrecedents)}
          />
          <Stat label="Clics totaux" value={formatNombre(donnees.totaux.clics)} />
          <Stat label="Impressions" value={formatNombre(donnees.totaux.impressions)} />
          <Stat label="CTR" value={formatPourcentFraction(donnees.totaux.ctr)} />
          <Stat
            label="Position moyenne (plus bas = mieux classé)"
            value={formatDecimal(donnees.totaux.position)}
          />
        </dl>
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
      <h3 className="mb-3 text-lg font-semibold text-neutral-900">Umami</h3>
      <EtatBloc nom={NOMS_BLOCS.umami} bloc={bloc} />
      <MetaBloc bloc={bloc} freshness={freshness} />
      {donnees && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Visites" value={formatNombre(donnees.visites)} />
          <Stat
            label="Part des visites multi-pages"
            value={formatPourcentFraction(donnees.profondeur)}
          />
          <Stat label="Événements" value={formatNombre(donnees.evenements)} />
        </dl>
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
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-lg font-semibold text-neutral-900">Passage technique</h3>
      <EtatBloc nom={NOMS_BLOCS.crawl} bloc={bloc} />
      <MetaBloc bloc={bloc} freshness={freshness} />
      {donnees && pagesPassees && (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Pages passées"
            value={pagesPassees.texte}
            alarme={pagesPassees.alarme}
          />
          <Stat label="Bloquées" value={formatNombre(donnees.bloquees)} />
          <Stat label="Échecs" value={formatNombre(donnees.echecs)} />
          <Stat
            label="Pages sans titre"
            value={compterManquants(donnees.pages, (p) => !p.titre)}
          />
          <Stat
            label="Pages sans description"
            value={compterManquants(donnees.pages, (p) => !p.description)}
          />
          <Stat
            label="Pages sans hreflang"
            value={compterManquants(donnees.pages, (p) => p.hreflang.length === 0)}
          />
        </dl>
      )}
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
                <th className="px-3 py-2 text-right">Semaine précédente</th>
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
  const enErreur = pages.filter((p) => p.statut !== 200);
  return (
    <div className="mb-8">
      <h3 className="mb-1 text-lg font-semibold text-neutral-900">Passage technique</h3>
      {enErreur.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-sm font-semibold text-neutral-900">
            Pages sans statut 200
          </h4>
          <TableauEnveloppe>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Chemin</th>
                <th className="px-3 py-2 text-right">Statut</th>
                <th className="px-3 py-2">Canonical</th>
              </tr>
            </thead>
            <tbody>
              {enErreur.slice(0, 20).map((p) => (
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
        Chaque bloc analyse sa propre période, dans son propre fuseau : ne
        rapprochez jamais un chiffre Search Console d&apos;un chiffre Umami,
        leurs fenêtres ne coïncident pas.
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
