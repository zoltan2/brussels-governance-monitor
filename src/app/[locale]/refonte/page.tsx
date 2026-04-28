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
        <h1 className="font-serif text-4xl leading-tight text-slate-900 md:text-5xl">
          Aide-nous à refonder la home.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg">
          Le Brussels Governance Monitor prépare une refonte de sa page d&apos;accueil.
          Plutôt que d&apos;imposer un design, on te demande de te prononcer sur
          quatre axes structurants — pas sur des maquettes finies, mais sur la
          direction. Ton vote est consultatif&nbsp;: il alimente une décision
          éditoriale assumée publiquement à la clôture.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Trois minutes. Un seul vote par navigateur. Tu peux laisser un
          commentaire libre à la fin et, si tu veux, ton email pour suivre la suite.
        </p>
      </header>
      <RefonteForm />
    </main>
  );
}
