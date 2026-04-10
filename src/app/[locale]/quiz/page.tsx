// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import QuizLoader from '@/components/quiz/quiz-loader';
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
  return buildMetadata({
    locale,
    title: 'Quiz — Brussels Governance Monitor',
    description:
      'Testez vos connaissances sur la gouvernance bruxelloise : 10 questions tirées de l\'actualité et des 13 domaines suivis par BGM.',
    path: '/quiz',
  });
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-neutral-900">
          Connaissez-vous vraiment Bruxelles ?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          10 questions sur la gouvernance bruxelloise — tirées de l&apos;actualité récente et des
          13 domaines suivis par BGM. Questions régénérées à chaque mise à jour du site.
        </p>
      </div>

      <QuizLoader />
    </main>
  );
}
