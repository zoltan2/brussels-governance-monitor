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
    title: 'Aperçu — Texte fort',
    description: 'Aperçu de la home BGM avec un hero en texte éditorial fort.',
    path: '/refonte',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default async function TexteFortPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PreviewLayout optionLabel="texte fort">
      <section className="relative border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
            Aujourd&apos;hui à Bruxelles · 28 avril 2026
          </p>

          <h1 className="mt-8 text-[44px] font-light leading-[1.05] tracking-tight text-neutral-900 md:text-[88px] md:leading-[0.98] lg:text-[112px]">
            <span className="block">186 nationalités.</span>
            <span className="block text-neutral-400">19 communes.</span>
            <span className="block">Une seule région.</span>
          </h1>

          <div className="mt-12 grid gap-8 border-t border-neutral-200 pt-8 md:grid-cols-3">
            <p className="text-sm text-neutral-600">
              <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400">
                Cette semaine
              </span>
              Vivalis publie son tableau de bord. La fusion des zones de police annoncée pour 2027. Huit signaux dans le digest.
            </p>
            <p className="text-sm text-neutral-600">
              <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400">
                Au compteur
              </span>
              7 dossiers majeurs gelés. 4 engagements DPR sur 16 activés. 39 000 demandes de logement social en attente.
            </p>
            <p className="text-sm text-neutral-600">
              <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-400">
                À lire en cinq minutes
              </span>
              Le digest hebdomadaire, en français — disponible aussi en néerlandais, anglais, allemand, et neuf autres langues.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-neutral-50 transition hover:bg-neutral-800"
            >
              Lire le digest
              <span aria-hidden>→</span>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
            >
              Comprendre la crise
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* Decorative ghosted number — typographic accent */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 select-none font-mono text-[420px] font-bold leading-none tabular-nums text-neutral-100 md:right-12 md:text-[600px]"
          style={{ writingMode: 'horizontal-tb', zIndex: -1 }}
        >
          186
        </span>
      </section>
    </PreviewLayout>
  );
}
