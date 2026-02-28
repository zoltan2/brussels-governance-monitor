// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { DomainCard as DomainCardType } from '@/lib/content';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  blocked: 'bg-status-blocked text-white',
  delayed: 'bg-status-delayed text-white',
  ongoing: 'bg-status-ongoing text-white',
  resolved: 'bg-status-resolved text-white',
};

const confidenceStyles: Record<string, string> = {
  official: 'text-brand-700',
  estimated: 'text-status-delayed',
  unconfirmed: 'text-neutral-500',
};

interface DomainCardProps {
  card: DomainCardType;
  locale: string;
  headingLevel?: 'h2' | 'h3';
}

export function DomainCard({ card, locale, headingLevel = 'h3' }: DomainCardProps) {
  const t = useTranslations('domains');
  const Heading = headingLevel;

  return (
    <article className="flex flex-col rounded-lg border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <Heading className="text-lg font-semibold text-neutral-900">{card.title}</Heading>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusStyles[card.status],
          )}
        >
          {t(`status.${card.status}`)}
        </span>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-neutral-600">{card.summary}</p>

      {card.metrics.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500" role="heading" aria-level={headingLevel === 'h2' ? 3 : 4}>
            {t('metrics')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {card.metrics.slice(0, 4).map((metric) => (
              <div key={metric.label} className="rounded bg-neutral-50 p-2">
                <p className="text-lg font-bold text-brand-900">
                  {metric.value}
                  {metric.unit && (
                    <span className="ml-1 text-xs font-normal text-neutral-500">
                      {metric.unit}
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-500">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className={confidenceStyles[card.confidenceLevel]}>
            {t(`confidence.${card.confidenceLevel}`)}
          </span>
          <span>·</span>
          <time dateTime={card.lastModified}>{t('lastModified', { date: formatDate(card.lastModified, locale) })}</time>
        </div>
      </div>

      <Link
        href={{ pathname: '/domains/[slug]', params: { slug: card.slug } }}
        className="mt-3 inline-flex items-center text-sm font-medium text-brand-700 hover:text-brand-900"
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
