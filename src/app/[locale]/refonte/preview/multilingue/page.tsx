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
    title: 'Aperçu — Hero multilingue',
    description: 'Aperçu de la home BGM avec un hero centré sur les langues servies.',
    path: '/refonte',
  });
  return { ...base, robots: { index: false, follow: false } };
}

// 12 langues actives en test (état 2026-04-28). Cible 79.
const ACTIVE_LANGS: Array<{ code: string; phrase: string; native: string }> = [
  { code: 'FR', phrase: "Aujourd'hui à Bruxelles", native: 'Français' },
  { code: 'NL', phrase: 'Vandaag in Brussel', native: 'Nederlands' },
  { code: 'EN', phrase: 'Today in Brussels', native: 'English' },
  { code: 'DE', phrase: 'Heute in Brüssel', native: 'Deutsch' },
  { code: 'IT', phrase: 'Oggi a Bruxelles', native: 'Italiano' },
  { code: 'ES', phrase: 'Hoy en Bruselas', native: 'Español' },
  { code: 'PT', phrase: 'Hoje em Bruxelas', native: 'Português' },
  { code: 'AR', phrase: 'اليوم في بروكسل', native: 'العربية' },
  { code: 'TR', phrase: "Bugün Brüksel'de", native: 'Türkçe' },
  { code: 'UK', phrase: 'Сьогодні в Брюсселі', native: 'Українська' },
  { code: 'PL', phrase: 'Dziś w Brukseli', native: 'Polski' },
  { code: 'RO', phrase: 'Astăzi la Bruxelles', native: 'Română' },
];

export default async function MultilinguePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PreviewLayout optionLabel="hero multilingue">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-[auto_1fr] md:gap-20 md:items-center">
            {/* Counter */}
            <div className="text-center md:text-left">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
                Lisible aujourd&apos;hui en
              </p>
              <p className="mt-3 font-mono text-[120px] font-bold leading-none tabular-nums text-slate-900 md:text-[180px]">
                12
              </p>
              <p className="mt-2 text-2xl tracking-tight text-slate-500 md:text-3xl">
                langues
              </p>
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.22em] text-slate-400">
                / 79 en cible
              </p>
              <a
                href="#"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
              >
                Lire le digest
                <span aria-hidden>→</span>
              </a>
            </div>

            {/* Phrase grid — every active language declines the same phrase */}
            <div>
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                « Aujourd&apos;hui à Bruxelles » dit dans toutes les langues servies
              </p>
              <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {ACTIVE_LANGS.map((l) => (
                  <li
                    key={l.code}
                    className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-3"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400 tabular-nums">
                      {l.code}
                    </span>
                    <span className="flex-1 text-right text-base text-slate-900 md:text-lg">
                      {l.phrase}
                    </span>
                    <span className="hidden font-mono text-[10px] text-slate-400 sm:inline">
                      {l.native}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 max-w-xl text-sm text-slate-600">
                Le digest hebdomadaire est traduit chaque lundi. Cible : couvrir toutes les langues parlées par plus de 1 % de la population bruxelloise — soit 79 idiomes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PreviewLayout>
  );
}
