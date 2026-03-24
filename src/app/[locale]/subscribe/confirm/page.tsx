// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Suspense } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { getAllDossierTopicOptions } from '@/lib/content';
import { ConfirmClient } from './confirm-client';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const dossierLabels: Record<string, string> = {};
  for (const d of getAllDossierTopicOptions(locale as Locale)) {
    dossierLabels[d.topicId] = d.label;
  }

  return (
    <Suspense fallback={<ConfirmSkeleton />}>
      <ConfirmClient dossierLabels={dossierLabels} />
    </Suspense>
  );
}

function ConfirmSkeleton() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-neutral-100" />
          <div className="mx-auto mb-2 h-6 w-48 animate-pulse rounded bg-neutral-100" />
          <div className="mx-auto h-4 w-64 animate-pulse rounded bg-neutral-100" />
        </div>
      </div>
    </section>
  );
}
