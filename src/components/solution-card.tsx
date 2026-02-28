// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { SolutionCard as SolutionCardType } from '@/lib/content';
import { cn } from '@/lib/utils';

const feasibilityStyles: Record<string, string> = {
  high: 'bg-feasibility-high text-white',
  medium: 'bg-feasibility-medium text-white',
  low: 'bg-feasibility-low text-white',
  'very-low': 'bg-feasibility-very-low text-white',
  'near-zero': 'bg-feasibility-near-zero text-white',
};

interface SolutionCardProps {
  card: SolutionCardType;
}

export function SolutionCard({ card }: SolutionCardProps) {
  const t = useTranslations('solutions');

  return (
    <article className="flex flex-col rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-neutral-900">{card.title}</h3>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
            feasibilityStyles[card.feasibility],
          )}
        >
          {t(`feasibility.${card.feasibility}`)}
        </span>
      </div>

      <div className="mb-4 space-y-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t('mechanism')}
          </h4>
          <p className="mt-1 text-sm text-neutral-600">{card.mechanism}</p>
        </div>

        <div className="flex gap-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('timelineLabel')}
            </h4>
            <p className="mt-1 text-sm text-neutral-700">{t(`timeline.${card.timeline}`)}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('whoCanTrigger')}
            </h4>
            <p className="mt-1 text-sm text-neutral-700">{card.whoCanTrigger}</p>
          </div>
        </div>

        {card.precedent && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('precedent')}
            </h4>
            <p className="mt-1 text-sm text-neutral-600">
              {card.precedent.description} ({card.precedent.country}, {card.precedent.year})
            </p>
          </div>
        )}

        {card.risks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('risks')}
            </h4>
            <ul className="mt-1 space-y-1">
              {card.risks.map((risk) => (
                <li key={risk} className="flex items-start gap-1.5 text-sm text-neutral-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Link
        href={{ pathname: '/solutions/[slug]', params: { slug: card.slug } }}
        className="mt-auto inline-flex items-center text-sm font-medium text-brand-700 hover:text-brand-900"
        aria-label={`${t('readMore')} : ${card.title}`}
      >
        {t('readMore')}
        <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </article>
  );
}
