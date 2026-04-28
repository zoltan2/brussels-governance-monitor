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
    title: 'Aperçu — Surface hub renvoyé hors home',
    description: 'Aperçu : la home tease 1-2 productions, le reste vit sur /productions.',
    path: '/refonte',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default async function SurfaceHubPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PreviewLayout optionLabel="surface hub renvoyé hors home">
      <NeutralHero />

      {/* SURFACE — Hub renvoyé */}
      <section className="border-b border-slate-200 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            À lire cette semaine
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg bg-slate-900 p-6 text-white">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Digest hebdo · S17 · 5 min
              </span>
              <h3 className="mt-3 text-xl leading-tight tracking-tight">
                Le budget 2026 passe en deuxième lecture, le PRAS bloque, Vivalis publie son tableau de bord.
              </h3>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
                Lire (8 signaux) →
              </p>
            </article>

            <article className="rounded-lg border border-slate-200 bg-slate-50 p-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Magazine #17
              </span>
              <h3 className="mt-3 text-xl leading-tight tracking-tight text-slate-900">
                Les 8 signaux racontés à l&apos;horizontale.
              </h3>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-600">
                Voir le magazine →
              </p>
            </article>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3 border-t border-slate-200 pt-8 md:flex-row md:justify-between">
            <p className="text-sm text-slate-600">
              Podcast hebdo, quiz interactif, archives, digest en douze langues — tout l&apos;écosystème éditorial vit sur une page dédiée.
            </p>
            <a
              href="#"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-900 transition hover:bg-slate-900 hover:text-white"
            >
              Tout l&apos;écosystème
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </section>
    </PreviewLayout>
  );
}
