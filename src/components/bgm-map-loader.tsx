// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import dynamic from 'next/dynamic';
import { generateGraphData } from '@/lib/graph';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';

const BGMMap = dynamic(
  () => import('./bgm-map').then((mod) => mod.BGMMap),
  { ssr: false },
);

type Props = {
  locale: string;
  mode: 'homepage' | 'domains' | 'domain-detail';
  focusSlug?: string;
};

export function BGMMapLoader({ locale, mode, focusSlug }: Props) {
  const t = useTranslations('graph');
  const data = generateGraphData(locale as Locale, mode, focusSlug);

  if (data.nodes.length === 0) return null;

  const labels = {
    title: t('title'),
    accessibleListTitle: t('accessibleListTitle'),
    connections: t('connections'),
    viewPage: t('viewPage'),
    close: t('close'),
    status: {
      ongoing: t('status.ongoing'),
      blocked: t('status.blocked'),
      delayed: t('status.delayed'),
      resolved: t('status.resolved'),
    },
    type: {
      domain: t('type.domain'),
      dossier: t('type.dossier'),
    },
  };

  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <BGMMap data={data} labels={labels} />
      </div>
    </section>
  );
}
