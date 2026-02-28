// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { DossierCard } from '@/lib/content';

const phaseStyles: Record<string, string> = {
  announced: 'border-neutral-400 text-neutral-600',
  planned: 'border-brand-600 text-brand-700',
  'in-progress': 'border-status-ongoing text-status-ongoing',
  stalled: 'border-status-blocked text-status-blocked',
  completed: 'border-status-resolved text-status-resolved',
  cancelled: 'border-neutral-400 text-neutral-500',
};

export function RelatedDossiers({ dossiers }: { dossiers: DossierCard[] }) {
  const t = useTranslations('domains');
  const td = useTranslations('dossiers');

  if (dossiers.length === 0) return null;

  return (
    <div className="mt-10 rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {t('relatedDossiers')}
      </h2>
      <ul className="space-y-3">
        {dossiers.map((d) => (
          <li key={d.slug}>
            <Link
              href={{ pathname: '/dossiers/[slug]', params: { slug: d.slug } }}
              className="group block rounded-lg bg-neutral-50 p-3 transition-colors hover:bg-neutral-100"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-brand-700 group-hover:text-brand-900">
                  {d.title}
                </p>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${phaseStyles[d.phase]}`}
                >
                  {td(`phase.${d.phase}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{d.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
