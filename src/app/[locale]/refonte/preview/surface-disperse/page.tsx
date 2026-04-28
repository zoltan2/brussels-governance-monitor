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
    title: 'Aperçu — Surface dispersée contextuellement',
    description: 'Aperçu : pas de section dédiée à l\'écosystème, chaque format apparaît à sa place naturelle.',
    path: '/refonte',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default async function SurfaceDispersePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PreviewLayout optionLabel="surface dispersée contextuellement">
      <NeutralHero />

      {/* SURFACE — Dispersée */}
      <section className="border-b border-slate-200 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <header className="mb-8">
            <h2 className="text-2xl tracking-tight text-slate-900 md:text-3xl">
              La semaine institutionnelle
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Pas de section « productions ». Les formats BGM apparaissent au fil des sujets, à l&apos;endroit où ils servent. Le digest reste l&apos;entrée principale.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="border-t-2 border-slate-900 pt-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-700">
                  Logement
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-blue-700">
                  Podcast · S17
                </span>
              </div>
              <h3 className="text-xl tracking-tight text-slate-900">
                SLRB : 39 000 demandes, zéro livraison annoncée pour 2026.
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                La société de logement régionale publie son rapport trimestriel. L&apos;épisode podcast détaille les trois blocages identifiés.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Lire le dossier · Écouter (12 min) →
              </p>
            </article>

            <article className="border-t-2 border-slate-900 pt-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-700">
                  Mobilité
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-700">
                  Quiz · 4 langues
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-700">
                  Magazine #17
                </span>
              </div>
              <h3 className="text-xl tracking-tight text-slate-900">
                Good Move suspendu : où en est la procédure ?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Trois questions du quiz testent la connaissance du dossier. Le magazine de la semaine raconte la mise au frigo.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Voir le dossier · Tester · Lire le magazine →
              </p>
            </article>

            <article className="border-t-2 border-slate-900 pt-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-700">
                  Institutionnel
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-700">
                  Digest S17 · 8 signaux
                </span>
              </div>
              <h3 className="text-xl tracking-tight text-slate-900">
                Budget 2026 : deuxième lecture cette semaine.
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Le digest hebdomadaire couvre les arbitrages. Disponible dans douze langues.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Lire le digest · 12 langues →
              </p>
            </article>

            <article className="border-t-2 border-slate-900 pt-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-700">
                  Sécurité
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-blue-700">
                  Podcast · S16
                </span>
              </div>
              <h3 className="text-xl tracking-tight text-slate-900">
                Fusion des zones de police : annoncée pour 2027.
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Mécanique institutionnelle expliquée dans l&apos;épisode podcast de la semaine dernière.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Voir le dossier · Réécouter →
              </p>
            </article>
          </div>
        </div>
      </section>
    </PreviewLayout>
  );
}
