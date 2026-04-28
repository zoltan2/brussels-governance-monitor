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
    title: 'Aperçu — Thermomètre institutionnel',
    description: 'Aperçu de la home BGM avec un hero en thermomètre / baromètre institutionnel.',
    path: '/refonte',
  });
  return { ...base, robots: { index: false, follow: false } };
}

const VALUE = 62;

const SUB_INDICATORS = [
  { label: 'Crise gouvernementale', delta: '−18', detail: '423 jours sans gouvernement régional' },
  { label: 'Dossiers gelés', delta: '−12', detail: '7 dossiers majeurs suspendus' },
  { label: 'Retards budgétaires', delta: '−6', detail: 'Budget 2026 en deuxième lecture' },
  { label: 'Engagements DPR', delta: '−2', detail: '4 sur 16 engagements activés' },
];

const SPARKLINE = [54, 56, 58, 55, 57, 59, 60, 58, 60, 62, 61, 62];

export default async function ThermometrePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PreviewLayout optionLabel="thermomètre institutionnel">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-20">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
              Indice de fonctionnement institutionnel · BXL · 28 avril 2026
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:gap-16 md:items-end">
            {/* Gauge column */}
            <div>
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[80px] font-bold leading-none tabular-nums text-slate-900 md:text-[140px]">
                  {VALUE}
                </span>
                <span className="font-mono text-2xl text-slate-400">/ 100</span>
              </div>
              <p className="mt-3 max-w-md text-base text-slate-700 md:text-lg">
                Indice composite calculé chaque semaine à partir de la veille — crise gouvernementale, dossiers gelés, retards budgétaires, engagements DPR.
              </p>

              {/* Big horizontal gauge */}
              <div className="mt-10">
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-300 to-emerald-500"
                    style={{ width: `${VALUE}%` }}
                  />
                  <div
                    className="absolute top-[-6px] h-[28px] w-1 rounded-full bg-slate-900"
                    style={{ left: `calc(${VALUE}% - 2px)` }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  <span>Crise institutionnelle</span>
                  <span>Fonctionnement normal</span>
                </div>
              </div>

              {/* Sparkline (12 dernières semaines) */}
              <div className="mt-10">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  Évolution · 12 dernières semaines
                </p>
                <div className="flex h-16 items-end gap-1">
                  {SPARKLINE.map((v, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${
                        i === SPARKLINE.length - 1 ? 'bg-slate-900' : 'bg-slate-300'
                      }`}
                      style={{ height: `${(v / 100) * 100}%` }}
                      title={`S${i + 6}: ${v}`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-400">
                  <span>S06</span>
                  <span>S17</span>
                </div>
              </div>
            </div>

            {/* Sub-indicators column */}
            <div className="border-l border-slate-200 pl-8 md:min-w-[280px]">
              <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Composantes de l&apos;indice
              </p>
              <ul className="space-y-5">
                {SUB_INDICATORS.map((s) => (
                  <li key={s.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-slate-900">{s.label}</span>
                      <span className="font-mono text-sm font-semibold text-amber-700 tabular-nums">
                        {s.delta}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{s.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Méthodologie →
              </p>
            </div>
          </div>
        </div>
      </section>
    </PreviewLayout>
  );
}
