// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { PreviewLayout } from '@/components/refonte/preview-layout';
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
    <PreviewLayout optionLabel="mosaïque éditoriale">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-20">
          <div className="mb-8 flex items-baseline justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
              Cette semaine sur BGM · Semaine 17, avril 2026
            </p>
            <p className="hidden font-mono text-xs uppercase tracking-[0.22em] text-neutral-400 md:block">
              5 productions
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
            {/* Lead — Digest (spans 2 cols, 2 rows on md) */}
            <article className="md:col-span-2 md:row-span-2 group relative flex flex-col justify-between overflow-hidden rounded-lg bg-neutral-900 p-8 text-neutral-50 md:p-12">
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-300">
                    Digest hebdo
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-50/40">
                    S17 · 28 avril 2026
                  </span>
                </div>
                <h2 className="text-3xl leading-[1.1] tracking-tight md:text-5xl md:leading-[1.05]">
                  Le budget 2026 passe en deuxième lecture, le PRAS bloque, Vivalis publie son tableau de bord.
                </h2>
                <p className="mt-6 max-w-2xl text-base text-neutral-50/80 md:text-lg">
                  Huit signaux pour comprendre la semaine institutionnelle bruxelloise, en cinq minutes. Disponible aussi en audio et dans onze autres langues.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-neutral-50/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] backdrop-blur transition group-hover:bg-neutral-50/20">
                  Lire le digest
                  <span aria-hidden>→</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-50/50">
                  ~5 min · 8 signaux
                </span>
              </div>
              <span
                aria-hidden
                className="absolute -right-12 -top-8 select-none font-mono text-[260px] font-bold leading-none text-neutral-50/[0.04]"
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
                <h3 className="mt-3 text-xl leading-tight tracking-tight text-neutral-900">
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
            <article className="group flex flex-col justify-between overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 p-6 transition hover:border-neutral-400">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-700">
                  Quiz · 4 langues
                </span>
                <h3 className="mt-3 text-xl leading-tight tracking-tight text-neutral-900">
                  Connais-tu vraiment Bruxelles&nbsp;?
                </h3>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-700">
                  Tester →
                </span>
                <span className="font-mono text-[10px] tracking-tight text-neutral-400">
                  10 questions
                </span>
              </div>
            </article>

            {/* Multilingue ribbon (5e brique en pied de mosaïque) */}
            <article className="md:col-span-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-6 py-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                  Lisible aujourd&apos;hui en
                </span>
                <span className="ml-3 font-mono text-sm text-neutral-900">
                  12 langues
                </span>
                <span className="ml-2 font-mono text-[10px] text-neutral-400">/ 79 cible</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['FR', 'NL', 'EN', 'DE', 'IT', 'ES', 'PT', 'AR', 'TR', 'UK', 'PL', 'RO'].map(
                  (l) => (
                    <span
                      key={l}
                      className="rounded border border-neutral-300 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] tracking-tight text-neutral-600"
                    >
                      {l}
                    </span>
                  ),
                )}
                <span className="font-mono text-[10px] tracking-[0.18em] text-neutral-400">
                  /digest →
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>
    </PreviewLayout>
  );
}
