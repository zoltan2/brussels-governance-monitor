// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base = buildMetadata({
    locale,
    title: 'Aperçu — Mosaïque éditoriale',
    description: 'Aperçu de la home BGM avec un hero en mosaïque éditoriale.',
    path: '/refonte',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default async function MosaiquePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-slate-50 text-slate-900">
      {/* Preview ribbon — sticky reminder this is a preview */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-amber-50 px-4 py-2.5 text-center text-xs">
        <span className="font-mono uppercase tracking-[0.18em] text-amber-900">
          Aperçu · Hero mosaïque éditoriale
        </span>
        <span className="mx-3 text-amber-700/60">·</span>
        <Link
          href="/refonte"
          className="font-mono uppercase tracking-[0.18em] text-amber-900 underline-offset-4 hover:underline"
        >
          ← Retour au vote
        </Link>
      </div>

      {/* Minimal nav placeholder (simulates BGM nav without rendering it real) */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="font-mono text-sm font-semibold tracking-tight text-slate-900">
            Brussels Governance Monitor
          </span>
          <span className="hidden gap-6 font-mono text-xs uppercase tracking-[0.18em] text-slate-500 md:flex">
            <span>Domaines</span>
            <span>Dossiers</span>
            <span>Communes</span>
            <span>Comprendre</span>
          </span>
        </div>
      </nav>

      {/* HERO — MOSAÏQUE ÉDITORIALE */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-20">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Cette semaine sur BGM · Semaine 17, avril 2026
            </p>
            <p className="hidden font-mono text-xs uppercase tracking-[0.22em] text-slate-400 md:block">
              5 productions
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
            {/* Lead — Digest (spans 2 cols, 2 rows on md) */}
            <article className="md:col-span-2 md:row-span-2 group relative flex flex-col justify-between overflow-hidden rounded-lg bg-slate-900 p-8 text-white md:p-12">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300">
                    Digest hebdo
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">
                    S17 · 28 avril 2026
                  </span>
                </div>
                <h2 className="text-3xl leading-[1.1] tracking-tight md:text-5xl md:leading-[1.05]">
                  Le budget 2026 passe en deuxième lecture, le PRAS bloque, Vivalis publie son tableau de bord.
                </h2>
                <p className="mt-6 max-w-2xl text-base text-white/80 md:text-lg">
                  Huit signaux pour comprendre la semaine institutionnelle bruxelloise, en cinq minutes. Disponible aussi en audio et dans onze autres langues.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] backdrop-blur transition group-hover:bg-white/20">
                  Lire le digest
                  <span aria-hidden>→</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                  ~5 min · 8 signaux
                </span>
              </div>
              <span
                aria-hidden
                className="absolute -right-12 -top-8 select-none font-mono text-[260px] font-bold leading-none text-white/[0.04]"
              >
                17
              </span>
            </article>

            {/* Magazine */}
            <article className="group flex flex-col justify-between overflow-hidden rounded-lg bg-amber-50 p-6 transition hover:bg-amber-100/70">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-700">
                  Magazine #17
                </span>
                <h3 className="mt-3 text-xl leading-tight tracking-tight text-slate-900">
                  8 signaux racontés à l&apos;horizontale.
                </h3>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-700/70">
                  Lire →
                </span>
                <span className="font-mono text-[10px] tracking-tight text-amber-700/50">
                  magazine.governance.brussels
                </span>
              </div>
            </article>

            {/* Podcast */}
            <article className="group flex flex-col justify-between overflow-hidden rounded-lg bg-blue-950 p-6 text-white transition hover:bg-blue-900">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-200">
                  Podcast · FR + NL
                </span>
                <h3 className="mt-3 text-xl leading-tight tracking-tight">
                  Le briefing : la semaine en quinze minutes.
                </h3>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30">
                  <span aria-hidden className="ml-0.5 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
                  Écouter
                </span>
              </div>
            </article>

            {/* Quiz */}
            <article className="group flex flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white p-6 transition hover:border-slate-400">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-700">
                  Quiz · 4 langues
                </span>
                <h3 className="mt-3 text-xl leading-tight tracking-tight text-slate-900">
                  Connais-tu vraiment Bruxelles&nbsp;?
                </h3>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-700">
                  Tester →
                </span>
                <span className="font-mono text-[10px] tracking-tight text-slate-400">
                  10 questions
                </span>
              </div>
            </article>

            {/* Multilingue ribbon (5e brique en pied de mosaïque) */}
            <article className="md:col-span-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Lisible aujourd&apos;hui en
                </span>
                <span className="ml-3 font-mono text-sm text-slate-900">
                  12 langues
                </span>
                <span className="ml-2 font-mono text-[10px] text-slate-400">/ 79 cible</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['FR', 'NL', 'EN', 'DE', 'IT', 'ES', 'PT', 'AR', 'TR', 'UK', 'PL', 'RO'].map(
                  (l) => (
                    <span
                      key={l}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-tight text-slate-600"
                    >
                      {l}
                    </span>
                  ),
                )}
                <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400">
                  /digest →
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* SECTION SOUS LE HERO — Compteur de crise (existant, conservé tel quel dans le redesign) */}
      <section className="bg-gradient-to-b from-slate-800 to-slate-700 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-sm text-white/75">
            <span className="font-semibold tabular-nums">613</span> jours archivés depuis l&apos;élection régionale du 9 juin 2024.
          </p>
          <p className="mt-2 font-mono text-7xl font-bold tabular-nums tracking-tight md:text-8xl">
            423
          </p>
          <p className="mt-2 text-lg uppercase tracking-[0.22em] text-white/85 md:text-xl">
            jours sans gouvernement régional
          </p>
        </div>
      </section>

      {/* SECTION — Domaines (placeholder simple, conservée du design actuel) */}
      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <header className="mb-8 flex items-baseline justify-between">
            <h2 className="text-2xl tracking-tight text-slate-900 md:text-3xl">
              Treize domaines, suivis en continu
            </h2>
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
              Échantillon
            </span>
          </header>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { d: 'Mobilité', m: 'Good Move suspendu, contentieux en cours', s: 'amber' },
              { d: 'Logement', m: 'SLRB : 39 000 demandes, 0 livraisons 2026', s: 'amber' },
              { d: 'Sécurité', m: 'Fusion zones de police annoncée pour 2027', s: 'blue' },
            ].map((c) => (
              <article
                key={c.d}
                className="rounded-lg border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-400"
              >
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    c.s === 'amber' ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                />
                <h3 className="mt-3 text-lg tracking-tight text-slate-900">{c.d}</h3>
                <p className="mt-2 text-sm text-slate-600">{c.m}</p>
                <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Voir le domaine →
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PIED — retour au vote */}
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Fin de l&apos;aperçu
        </p>
        <p className="mt-3 max-w-xl mx-auto text-sm text-slate-700">
          Cet aperçu simule la home BGM avec un hero en mosaïque éditoriale. Le reste de la page (compteur de crise, sections domaines, etc.) ne change pas.
        </p>
        <Link
          href="/refonte"
          className="mt-6 inline-flex items-center gap-2 rounded border border-slate-900 bg-white px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-900 transition hover:bg-slate-900 hover:text-white"
        >
          ← Retour au vote
        </Link>
      </footer>
    </div>
  );
}
