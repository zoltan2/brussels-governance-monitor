// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import { RefonteForm } from './refonte-form';

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
    title: 'Refonte de la home — consultation participative',
    description: "Choisis avec nous l'angle de la prochaine home de governance.brussels.",
    path: '/refonte',
  });
  return {
    ...base,
    robots: { index: false, follow: false },
  };
}

export default async function RefontePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <header className="mb-12 border-b border-slate-200 pb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Consultation · 2026
        </p>
        <h1 className="text-4xl leading-tight tracking-tight text-slate-900 md:text-5xl">
          Aide-nous à faire évoluer la homepage.
        </h1>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg">
          Le Brussels Governance Monitor prépare une nouvelle version de sa page d&apos;accueil.
        </p>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg">
          Plutôt que d&apos;imposer un choix, on préfère ouvrir la réflexion.
          Tu es invité·e à te positionner sur quatre axes structurants — pas
          sur des maquettes finalisées, mais sur des orientations claires.
        </p>

        <p className="mt-6 max-w-2xl border-l-4 border-slate-900 pl-5 text-base leading-relaxed text-slate-800 md:text-lg">
          Ton vote est consultatif, mais il compte&nbsp;:
          <br />
          il viendra nourrir une décision éditoriale qui sera expliquée
          publiquement une fois le processus terminé.
        </p>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-slate-600">
          Cela prend environ trois minutes. Un seul vote par navigateur.
          <br />
          À la fin, tu peux ajouter un commentaire libre. Et si tu le
          souhaites, laisser ton email pour suivre la suite.
        </p>
      </header>
      <RefonteForm />
    </main>
  );
}
