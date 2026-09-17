// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { DossierCard } from '@/lib/content';
import { dossierBadgeClass } from '@/lib/status-badge';

export function RelatedDossiers({ dossiers }: { dossiers: DossierCard[] }) {
  const t = useTranslations('domains');
  const td = useTranslations('dossiers');

  if (dossiers.length === 0) return null;

  return (
    <div className="mt-10 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
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
                  className={dossierBadgeClass(d.phase)}
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
