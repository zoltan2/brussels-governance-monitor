// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * Minimal CTA for the end of content cards (domains, dossiers, communes, sectors).
 * Designed to be a quiet "whisper" — one line, no box, just a border-top.
 */
export function SupportCtaInline() {
  const t = useTranslations('supportCta');

  return (
    <div className="mt-8 border-t border-neutral-100 pt-4 text-center">
      <p className="text-xs text-neutral-500">
        {t('cardLine')}{' '}
        <Link href="/support" className="font-medium text-brand-700 hover:underline">
          {t('cardLink')}
        </Link>
      </p>
    </div>
  );
}

/**
 * CTA block for the homepage — slightly more prominent with stats.
 */
export function SupportCtaHome() {
  const t = useTranslations('supportCta');

  return (
    <section className="bg-neutral-50 py-10">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <p className="text-sm text-neutral-600">
          <strong className="text-neutral-700">528</strong> {t('statPages')} · <strong className="text-neutral-700">323</strong> {t('statSources')} · <strong className="text-neutral-700">4</strong> {t('statLangs')}
        </p>
        <p className="mt-1 text-xs text-neutral-500">{t('homeLine')}</p>
        <Link
          href="/support"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-brand-700 px-5 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-900 hover:text-neutral-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
          {t('homeButton')}
        </Link>
      </div>
    </section>
  );
}

/**
 * CTA for the changelog page — dashed border, one line.
 */
export function SupportCtaChangelog() {
  const t = useTranslations('supportCta');

  return (
    <div className="mb-6 rounded-md border border-dashed border-neutral-200 px-4 py-3 text-center">
      <p className="text-xs text-neutral-500">
        {t('changelogLine')}{' '}
        <Link href="/support" className="font-medium text-brand-700 hover:underline">
          {t('cardLink')}
        </Link>
      </p>
    </div>
  );
}

/**
 * Bandeau « Ce projet vit grâce à vous », le même en pied de page et en haut
 * des dossiers. Un seul composant pour les deux emplacements : une copie finit
 * toujours par diverger (texte, lien, couleur changés d'un seul côté).
 *
 * `position` part dans Umami (`soutien-clic`) : avant le 23/09/2026, aucun clic
 * vers /support n'était mesuré, et rien ne permettait de savoir si un bandeau en
 * haut de page rapporte quelque chose.
 */
export function SupportBanner({
  position,
  className,
  hideOnPrint = false,
}: {
  position: 'pied-de-page' | 'dossier-haut' | 'domaine-haut' | 'secteur-haut';
  className?: string;
  /** Un dossier imprimé ne commence pas par un appel au don. */
  hideOnPrint?: boolean;
}) {
  const t = useTranslations('footer');

  return (
    <div
      data-hide-print={hideOnPrint ? '' : undefined}
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-brand-700/20 bg-brand-900/5 px-6 py-5 sm:flex-row sm:justify-between',
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-neutral-800">{t('supportTitle')}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{t('supportSubtitle')}</p>
      </div>
      <Link
        href="/support"
        data-umami-event="soutien-clic"
        data-umami-event-position={position}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-900 px-5 py-2.5 text-xs font-semibold text-neutral-50 shadow-sm transition-all hover:bg-brand-800 hover:shadow-md"
      >
        {t('supportCta')}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
      </Link>
    </div>
  );
}
