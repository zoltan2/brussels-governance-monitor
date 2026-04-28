// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { PreviewLayout } from '@/components/refonte/preview-layout';
import { NeutralHero } from '@/components/refonte/neutral-hero';
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
    title: 'Aperçu — Surface mosaïque + bandeau multilingue',
    description: 'Aperçu : section dédiée à l\'écosystème en mosaïque sous le hero, bandeau multilingue compris.',
    path: '/refonte',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default async function SurfaceMosaiquePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PreviewLayout optionLabel="surface mosaïque + bandeau multilingue">
      <NeutralHero />

      {/* SURFACE — Mosaïque dédiée */}
      <section className="border-b border-slate-200 bg-slate-50 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <header className="mb-8 flex items-baseline justify-between">
            <h2 className="text-2xl tracking-tight text-slate-900 md:text-3xl">
              Cette semaine sur BGM
            </h2>
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
              4 productions
            </span>
          </header>

          <div className="grid gap-4 md:grid-cols-4">
            <article className="rounded-lg bg-slate-900 p-5 text-white">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Digest hebdo · S17
              </span>
              <h3 className="mt-3 text-lg leading-tight tracking-tight">
                8 signaux pour comprendre la semaine institutionnelle.
              </h3>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
                Lire →
              </p>
            </article>

            <article className="rounded-lg bg-amber-50 p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-700">
                Magazine #17
              </span>
              <h3 className="mt-3 text-lg leading-tight tracking-tight text-slate-900">
                8 signaux racontés à l&apos;horizontale.
              </h3>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-700/70">
                Lire →
              </p>
            </article>

            <article className="rounded-lg bg-blue-950 p-5 text-white">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-200">
                Podcast · FR + NL
              </span>
              <h3 className="mt-3 text-lg leading-tight tracking-tight">
                Le briefing : la semaine en quinze minutes.
              </h3>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
                Écouter →
              </p>
            </article>

            <article className="rounded-lg border border-slate-200 bg-white p-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-700">
                Quiz · 4 langues
              </span>
              <h3 className="mt-3 text-lg leading-tight tracking-tight text-slate-900">
                Connais-tu vraiment Bruxelles&nbsp;?
              </h3>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600">
                Tester →
              </p>
            </article>
          </div>

          {/* Bandeau multilingue */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-6 py-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Lisible aujourd&apos;hui en
              </span>
              <span className="ml-3 font-mono text-sm text-slate-900">12 langues</span>
              <span className="ml-2 font-mono text-[10px] text-slate-400">/ 79 cible</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['FR', 'NL', 'EN', 'DE', 'IT', 'ES', 'PT', 'AR', 'TR', 'UK', 'PL', 'RO'].map((l) => (
                <span
                  key={l}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] tracking-tight text-slate-600"
                >
                  {l}
                </span>
              ))}
              <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400">/digest →</span>
            </div>
          </div>
        </div>
      </section>
    </PreviewLayout>
  );
}
