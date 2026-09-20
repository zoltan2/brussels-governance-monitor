// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/require-admin';
import {
  readSeoReport,
  type Bloc,
  type CrawlDonnees,
  type FenetreRapport,
  type GscDonnees,
  type RapportSeo,
  type StatutBloc,
  type UmamiDonnees,
} from '@/lib/seo-report';
import { freshnessClassName } from '@/lib/snapshot-freshness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admin — Rapport SEO hebdomadaire',
    robots: { index: false, follow: false },
  };
}

const LIBELLES_STATUT: Record<StatutBloc, string> = {
  ok: 'à jour',
  error: 'en panne',
  blocked: 'bloqué',
  absent: 'aucun relevé',
  'format-inconnu': 'format non reconnu',
};

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

function formatHoraire(iso: string | null, fuseau: string): string {
  if (!iso) return 'indisponible';
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 'date illisible';
  return new Date(parsed).toLocaleString('fr-BE', {
    timeZone: fuseau,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFenetre(fenetre: FenetreRapport | null): string {
  if (!fenetre || (!fenetre.debut && !fenetre.fin)) return 'fenêtre indisponible';
  const debut = fenetre.debut ?? 'indisponible';
  const fin = fenetre.fin ?? 'indisponible';
  const fuseau = fenetre.fuseau ?? 'fuseau indisponible';
  return `${debut} → ${fin} (${fuseau})`;
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
      {bloc.message ? ` — ${bloc.message}` : ''}. Les autres blocs restent
      affichés ci-dessous quand ils sont à jour.
    </p>
  );
}

function MetaBloc({ bloc }: { bloc: Bloc<unknown> }) {
  return (
    <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
      <span>
        État : <span className="text-neutral-700">{LIBELLES_STATUT[bloc.status]}</span>
      </span>
      <span>
        Relevé (UTC) :{' '}
        <span className="text-neutral-700">{formatHoraire(bloc.generatedAt, 'UTC')}</span>
      </span>
      <span>
        Script : <EmpreinteScript sha={bloc.scriptSha256} />
      </span>
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 p-3">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-neutral-900">
        {value}
      </dd>
    </div>
  );
}

function SectionGsc({ bloc }: { bloc: Bloc<GscDonnees> }) {
  const donnees = bloc.donnees;
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-xl font-semibold text-neutral-900">Search Console</h2>
      <p className="mb-3 text-sm text-neutral-600">
        Fenêtre : {formatFenetre(donnees?.fenetre ?? null)}
      </p>
      <EtatBloc nom="Search Console" bloc={bloc} />
      <MetaBloc bloc={bloc} />
      {donnees && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Clics Belgique"
              value={formatNombre(donnees.clicsBelgique)}
            />
            <Stat
              label="Clics Belgique, semaine précédente"
              value={formatNombre(donnees.clicsBelgiquePrecedents)}
            />
            <Stat label="Clics totaux" value={formatNombre(donnees.totaux.clics)} />
            <Stat
              label="Impressions"
              value={formatNombre(donnees.totaux.impressions)}
            />
            <Stat label="CTR" value={formatPourcentFraction(donnees.totaux.ctr)} />
            <Stat
              label="Position moyenne"
              value={formatDecimal(donnees.totaux.position)}
            />
          </dl>

          {donnees.requetes.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">
                Requêtes les plus cliquées
              </h3>
              <p className="mb-2 text-xs text-neutral-500">
                Liste couvrant environ {formatPourcentFraction(donnees.partRequetes)}{' '}
                des clics seulement : Search Console anonymise les requêtes rares,
                cette liste n&apos;est donc pas exhaustive.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-1 pr-2">Requête</th>
                    <th className="py-1 pr-2 text-right">Clics</th>
                    <th className="py-1 pr-2 text-right">Impressions</th>
                    <th className="py-1 text-right">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {donnees.requetes.slice(0, 10).map((r) => (
                    <tr key={r.requete} className="border-t border-neutral-100">
                      <td className="py-1 pr-2 text-neutral-800">{r.requete}</td>
                      <td className="py-1 pr-2 text-right tabular-nums text-neutral-700">
                        {formatNombre(r.clics)}
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums text-neutral-700">
                        {formatNombre(r.impressions)}
                      </td>
                      <td className="py-1 text-right tabular-nums text-neutral-700">
                        {formatDecimal(r.position)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {donnees.pages.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">
                Pages les plus cliquées
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-1 pr-2">URL</th>
                    <th className="py-1 pr-2 text-right">Clics</th>
                    <th className="py-1 text-right">Semaine précédente</th>
                  </tr>
                </thead>
                <tbody>
                  {donnees.pages.slice(0, 10).map((p) => (
                    <tr key={p.url} className="border-t border-neutral-100">
                      <td className="py-1 pr-2 text-neutral-800">{p.url}</td>
                      <td className="py-1 pr-2 text-right tabular-nums text-neutral-700">
                        {formatNombre(p.clics)}
                      </td>
                      <td className="py-1 text-right tabular-nums text-neutral-700">
                        {formatNombre(p.clicsPrecedents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SectionUmami({ bloc }: { bloc: Bloc<UmamiDonnees> }) {
  const donnees = bloc.donnees;
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-xl font-semibold text-neutral-900">Umami</h2>
      <p className="mb-3 text-sm text-neutral-600">
        Fenêtre : comptée en UTC, fuseau distinct de Search Console (Pacifique).
        Ce bloc ne transmet pas ses dates de début et de fin.
      </p>
      <EtatBloc nom="Umami" bloc={bloc} />
      <MetaBloc bloc={bloc} />
      {donnees && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Visites" value={formatNombre(donnees.visites)} />
            <Stat
              label="Profondeur (multi-pages)"
              value={formatPourcentFraction(donnees.profondeur)}
            />
            <Stat label="Événements" value={formatNombre(donnees.evenements)} />
          </dl>

          {donnees.visitesIa.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">
                Visites d&apos;assistants, par source
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-1 pr-2">Source</th>
                    <th className="py-1 text-right">Visites</th>
                  </tr>
                </thead>
                <tbody>
                  {donnees.visitesIa.map((v) => (
                    <tr key={v.source} className="border-t border-neutral-100">
                      <td className="py-1 pr-2 text-neutral-800">{v.source}</td>
                      <td className="py-1 text-right tabular-nums text-neutral-700">
                        {formatNombre(v.visites)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {donnees.pagesEntree.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">
                Pages d&apos;entrée les plus visitées
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-1 pr-2">Chemin</th>
                    <th className="py-1 pr-2 text-right">Visites</th>
                    <th className="py-1 text-right">Dont assistants</th>
                  </tr>
                </thead>
                <tbody>
                  {donnees.pagesEntree.slice(0, 10).map((p) => (
                    <tr key={p.chemin} className="border-t border-neutral-100">
                      <td className="py-1 pr-2 text-neutral-800">{p.chemin}</td>
                      <td className="py-1 pr-2 text-right tabular-nums text-neutral-700">
                        {formatNombre(p.visites)}
                      </td>
                      <td className="py-1 text-right tabular-nums text-neutral-700">
                        {formatNombre(p.visitesIa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SectionCrawl({ bloc }: { bloc: Bloc<CrawlDonnees> }) {
  const donnees = bloc.donnees;
  return (
    <section className="mb-10">
      <h2 className="mb-1 text-xl font-semibold text-neutral-900">
        Passage technique
      </h2>
      <EtatBloc nom="Crawl technique" bloc={bloc} />
      <MetaBloc bloc={bloc} />
      {donnees && (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Pages passées" value={formatNombre(donnees.pages.length)} />
            <Stat label="Bloquées" value={formatNombre(donnees.bloquees)} />
            <Stat label="Échecs" value={formatNombre(donnees.echecs)} />
          </dl>

          {donnees.pages.some((p) => p.statut !== 200) && (
            <div className="mt-6">
              <h3 className="mb-1 text-sm font-semibold text-neutral-900">
                Pages sans statut 200
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <th className="py-1 pr-2">URL</th>
                    <th className="py-1 pr-2 text-right">Statut</th>
                    <th className="py-1 text-right">Canonical</th>
                  </tr>
                </thead>
                <tbody>
                  {donnees.pages
                    .filter((p) => p.statut !== 200)
                    .slice(0, 20)
                    .map((p) => (
                      <tr key={p.url} className="border-t border-neutral-100">
                        <td className="py-1 pr-2 text-neutral-800">{p.url}</td>
                        <td className="py-1 pr-2 text-right tabular-nums text-neutral-700">
                          {formatNombre(p.statut)}
                        </td>
                        <td className="py-1 text-right text-neutral-700">
                          {p.canonical ?? 'indisponible'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SectionActions({ bloc }: { bloc: Bloc<GscDonnees> }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xl font-semibold text-neutral-900">
        Actions suggérées
      </h2>
      {bloc.status !== 'ok' && (
        <p className="text-sm text-neutral-600">
          Indisponible : le bloc Search Console qui les calcule n&apos;est pas à
          jour (voir la section Search Console ci-dessus).
        </p>
      )}
      {bloc.status === 'ok' && (bloc.donnees?.actions.length ?? 0) === 0 && (
        <p className="text-sm text-neutral-600">Aucune action cette semaine.</p>
      )}
      {bloc.status === 'ok' && bloc.donnees && bloc.donnees.actions.length > 0 && (
        <ul className="space-y-3">
          {bloc.donnees.actions.map((action, i) => (
            <li
              key={`${action.regle}-${action.url}-${i}`}
              className="rounded border border-neutral-200 bg-neutral-50 p-4"
            >
              <p className="text-sm font-semibold text-neutral-900">
                {action.titre ?? action.regle}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Règle : {action.regle}
                {action.priorite !== null ? ` · priorité ${action.priorite}` : ''}
              </p>
              <p className="mt-2 text-sm text-neutral-700">{action.preuve}</p>
              <p className="mt-2 text-sm">
                <a
                  href={action.url}
                  className="text-brand-700 underline-offset-4 hover:underline"
                >
                  {action.url}
                </a>
              </p>
              {action.fenetre && (
                <p className="mt-2 text-xs text-neutral-500">
                  Fenêtre : {formatFenetre(action.fenetre)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
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

      <SectionGsc bloc={rapport.blocs.gsc} />
      <SectionUmami bloc={rapport.blocs.umami} />
      <SectionCrawl bloc={rapport.blocs.crawl} />
      <SectionActions bloc={rapport.blocs.gsc} />

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-neutral-900">
          Historique
        </h2>
        <p className="text-sm text-neutral-600">
          Le VPS conserve un historique glissant des rapports hebdomadaires,
          mais cette page n&apos;a pour l&apos;instant accès qu&apos;au dernier
          relevé de chaque bloc : aucune lecture de l&apos;historique n&apos;est
          exposée par <code className="text-xs">readSeoReport()</code>.
        </p>
      </section>

      {rapport.fraicheur.gsc && (
        <p className={freshnessClassName(rapport.fraicheur.gsc.level)}>
          Search Console : {rapport.fraicheur.gsc.label}
        </p>
      )}
      {rapport.fraicheur.umami && (
        <p className={freshnessClassName(rapport.fraicheur.umami.level)}>
          Umami : {rapport.fraicheur.umami.label}
        </p>
      )}
      {rapport.fraicheur.crawl && (
        <p className={freshnessClassName(rapport.fraicheur.crawl.level)}>
          Crawl technique : {rapport.fraicheur.crawl.label}
        </p>
      )}
    </main>
  );
}
