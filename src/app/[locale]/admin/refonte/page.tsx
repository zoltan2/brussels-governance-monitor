// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getVoteStats } from '@/lib/refonte-votes';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin · Refonte vote',
  robots: { index: false, follow: false },
};

const AXIS_LABELS: Record<string, string> = {
  axis1: 'Hero visuel',
  axis2: 'Ton éditorial',
  axis3: 'Productions préférées',
  axis4: 'Rythme',
  axis5: 'Style de carte',
};

const OPTION_LABELS: Record<string, string> = {
  // Axis 1
  thermometre: 'Thermomètre',
  mosaique: 'Mosaïque',
  texte_fort: 'Texte fort',
  multilingue: 'Multilingue',
  // Axis 2
  sobre_actuel: 'Sobre actuel',
  sobre_vivant: 'Sobre + vivant',
  journalistique: 'Journalistique',
  voix_editeur: 'Voix éditeur',
  // Axis 3
  digest: 'Digest',
  magazine: 'Magazine',
  podcast: 'Podcast',
  quiz: 'Quiz',
  plusieurs: 'Plusieurs à égalité',
  // Axis 4
  quotidien: 'Quotidien',
  hebdo: 'Hebdo',
  evenement: 'Événement',
  mixte: 'Mixte',
  // Axis 5
  minimal: 'Minimaliste',
  standard: 'Standard',
  chiffres: 'Synthèse chiffrée',
  complete: 'Synthèse complète',
};

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminRefontePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);

  const stats = await getVoteStats(50);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 border-b border-slate-200 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl tracking-tight text-slate-900">
          Consultation refonte — votes
        </h1>
        {!stats.storeConfigured && (
          <p
            role="alert"
            className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            ⚠ Upstash non configuré sur cet environnement. Les votes ne sont pas
            persistés (ou sont enregistrés en stdout du serveur).
          </p>
        )}
      </header>

      <section className="mb-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Total votes
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-slate-900">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            seuil de validité spec : ≥ 50
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Emails fournis · opt-in
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-slate-900">
            {stats.recent.filter((r) => r.email).length}
            <span className="ml-2 text-base text-slate-400">
              · {stats.recent.filter((r) => r.email_optin).length} opt-in
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            sur {stats.recent.length} récents
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
            Avec commentaire
          </p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-slate-900">
            {stats.recent.filter((r) => r.comment.length > 0).length}
            <span className="ml-2 text-base text-slate-400">/ {stats.recent.length} récents</span>
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Compteurs par axe
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(stats.breakdown).map(([axis, options]) => {
            const totalAxis = Object.values(options).reduce((a, b) => a + b, 0);
            return (
              <div
                key={axis}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <p className="mb-3 text-sm font-semibold tracking-tight text-slate-900">
                  {AXIS_LABELS[axis] ?? axis}
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(options)
                      .sort((a, b) => b[1] - a[1])
                      .map(([opt, n]) => {
                        const pct = totalAxis > 0 ? (n / totalAxis) * 100 : 0;
                        return (
                          <tr key={opt}>
                            <td className="py-1 text-slate-700">
                              {OPTION_LABELS[opt] ?? opt}
                            </td>
                            <td className="w-24 py-1 pl-2">
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-slate-900"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                            <td className="w-12 py-1 pl-2 text-right font-mono text-xs tabular-nums text-slate-700">
                              {n}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Derniers votes ({stats.recent.length})
        </h2>
        {stats.recent.length === 0 ? (
          <p className="text-sm italic text-slate-500">
            Aucun vote enregistré pour l&apos;instant.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Hero
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Ton
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Production
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Rythme
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Card
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Email · opt-in
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    Commentaire
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {formatTs(v.created_at)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {OPTION_LABELS[v.axis1] ?? v.axis1}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {OPTION_LABELS[v.axis2] ?? v.axis2}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {OPTION_LABELS[v.axis3] ?? v.axis3}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {OPTION_LABELS[v.axis4] ?? v.axis4}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {OPTION_LABELS[v.axis5] ?? v.axis5}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {v.email ? (
                        <span className="flex items-center gap-2">
                          <a
                            href={`mailto:${v.email}`}
                            className="font-mono text-slate-700 hover:underline"
                          >
                            {v.email}
                          </a>
                          {v.email_optin ? (
                            <span
                              title="opt-in newsletter accepté"
                              className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-800"
                            >
                              opt-in
                            </span>
                          ) : (
                            <span
                              title="email fourni sans opt-in newsletter"
                              className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-800"
                            >
                              no opt-in
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-md text-slate-600">
                      {v.comment || (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
