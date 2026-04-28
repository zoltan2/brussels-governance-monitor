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
      <section className="relative border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-32">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Aujourd&apos;hui à Bruxelles · 28 avril 2026
          </p>

          <h1 className="mt-8 text-[44px] font-light leading-[1.05] tracking-tight text-slate-900 md:text-[88px] md:leading-[0.98] lg:text-[112px]">
            <span className="block">423 jours</span>
            <span className="block text-slate-400">sans gouvernement</span>
            <span className="block">régional.</span>
          </h1>

          <div className="mt-12 grid gap-8 border-t border-slate-200 pt-8 md:grid-cols-3">
            <p className="text-sm text-slate-600">
              <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Cette semaine
              </span>
              Le budget 2026 passe en deuxième lecture, le PRAS bloque, Vivalis publie son tableau de bord. Huit signaux dans le digest.
            </p>
            <p className="text-sm text-slate-600">
              <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Au compteur
              </span>
              7 dossiers majeurs gelés. 4 engagements DPR sur 16 activés. 39 000 demandes de logement social en attente.
            </p>
            <p className="text-sm text-slate-600">
              <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                À lire en cinq minutes
              </span>
              Le digest hebdomadaire, en français — disponible aussi en néerlandais, anglais, allemand, et neuf autres langues.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
            >
              Lire le digest
              <span aria-hidden>→</span>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Comprendre la crise
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* Decorative ghosted number — typographic accent */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 select-none font-mono text-[420px] font-bold leading-none tabular-nums text-slate-100 md:right-12 md:text-[600px]"
          style={{ writingMode: 'horizontal-tb', zIndex: -1 }}
        >
          423
        </span>
      </section>
    </PreviewLayout>
  );
}
