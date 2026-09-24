// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatDate, slugify } from '@/lib/utils';

interface LatestUpdateBarProps {
  date: string;
  /** Première phrase du `changeSummary` de la fiche, ou repli sur le changelog (voir latest-update-headline.ts). */
  headline: string;
  isCorrection: boolean;
  /** Titre de la fiche cible, pour le nom accessible du lien. */
  cardTitle: string | null;
  section: string;
  targetSlug: string | null;
  anchor?: string;
  locale: string;
}

/**
 * Barre légère sous le héros. Le titre passe à la ligne au lieu d'être coupé
 * (`truncate` tranchait l'idée principale) ; `line-clamp` ne sert que de filet :
 * 3 lignes sur mobile, 2 au-delà. Aucune animation.
 */
export function LatestUpdateBar({
  date,
  headline,
  isCorrection,
  cardTitle,
  section,
  targetSlug,
  anchor,
  locale,
}: LatestUpdateBarProps) {
  const t = useTranslations('home');
  const linkHref = getLinkHref(section, targetSlug, anchor);

  const content = (
    <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
        <p className="flex shrink-0 flex-wrap items-center gap-x-1.5 text-xs text-neutral-500">
          <span className="text-status-delayed" aria-hidden="true">&#9679;</span>
          <span className="font-medium text-neutral-700">{t('latestUpdateLabel')}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={date} className="tabular-nums">
            {formatDate(date, locale)}
          </time>
          {isCorrection && (
            <span className="rounded border border-neutral-300 px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-700">
              {t('latestUpdateCorrection')}
            </span>
          )}
        </p>
        <p className="min-w-0 break-words text-sm leading-snug text-neutral-800 line-clamp-3 sm:line-clamp-2">
          {headline}
        </p>
      </div>
      {linkHref && (
        <span className="shrink-0 pt-0.5 text-sm text-brand-700 group-hover:text-brand-900" aria-hidden="true">
          &rarr;
        </span>
      )}
    </div>
  );

  if (linkHref) {
    return (
      <div className="border-b border-neutral-200 bg-neutral-100">
        <Link
          href={linkHref}
          data-umami-event="accueil-fait-du-jour"
          className="group block transition-colors hover:bg-neutral-200 focus-visible:outline-offset-[-2px] motion-reduce:transition-none"
        >
          {content}
          <span className="sr-only">{t('latestUpdateLinkLabel', { title: cardTitle ?? headline })}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="border-b border-neutral-200 bg-neutral-100">
      {content}
    </div>
  );
}

export function getLinkHref(section: string, slug: string | null, anchor?: string) {
  if (!slug) return null;
  const hash = anchor ? slugify(anchor) : undefined;
  switch (section) {
    case 'domains':
      return { pathname: '/domains/[slug]' as const, params: { slug }, hash };
    case 'dossiers':
      return { pathname: '/dossiers/[slug]' as const, params: { slug }, hash };
    case 'sectors':
      return { pathname: '/sectors/[slug]' as const, params: { slug }, hash };
    case 'communes':
      return { pathname: '/communes/[slug]' as const, params: { slug }, hash };
    case 'comparisons':
      return { pathname: '/comparisons/[slug]' as const, params: { slug }, hash };
    case 'solutions':
      return { pathname: '/solutions/[slug]' as const, params: { slug }, hash };
    default:
      return null;
  }
}
