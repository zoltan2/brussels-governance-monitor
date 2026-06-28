// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';

import { getRecentDigestLangs, getDigestEntry } from '@/lib/content';
import { CORE_DIGEST_LOCALES } from '@/lib/digest-langs';

/** Native names for the active digest languages; fallback = uppercased code. */
const NATIVE_NAME: Record<string, string> = {
  fr: 'Français', nl: 'Nederlands', en: 'English', de: 'Deutsch',
  ar: 'العربية', tr: 'Türkçe', es: 'Español', pt: 'Português',
  pl: 'Polski', ro: 'Română', sw: 'Kiswahili',
};
const nativeName = (lang: string) => NATIVE_NAME[lang] ?? lang.toUpperCase();
const isCore = (lang: string) => (CORE_DIGEST_LOCALES as readonly string[]).includes(lang);

export interface PublicationsBandLabels {
  eyebrow: string;
  title: string; // contains "{count}"
  subscribe: string;
  magazineCta: string;
}

export interface PublicationsBandViewProps {
  locale: string;
  langs: string[];
  latestCompleteWeek: string | null;
  magazine: { href: string } | null;
  subscribeHref: string;
  labels: PublicationsBandLabels;
}

/** Pure presentational view (props → JSX | null). Unit-tested. */
export function PublicationsBandView({
  locale,
  langs,
  latestCompleteWeek,
  magazine,
  subscribeHref,
  labels,
}: PublicationsBandViewProps) {
  if (!latestCompleteWeek || langs.length === 0) return null;

  const [year, weekNum] = latestCompleteWeek.split('-w');
  const weekPath = `${year}/w${weekNum}`;

  // Order: core-4 (UI order) first, then extras (helper already alpha-sorted).
  const core = (CORE_DIGEST_LOCALES as readonly string[]).filter((l) => langs.includes(l));
  const extras = langs.filter((l) => !isCore(l));
  const ordered = [...core, ...extras];

  const title = labels.title.replace('{count}', String(langs.length));

  return (
    <section className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">{labels.eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">{title}</h2>

        {/* Proof grid: core = links, extras = non-clickable proof. All carry lang=. */}
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={title}>
          {ordered.map((lang) => {
            const current = lang === locale;
            const base =
              'inline-block rounded-full border px-3 py-1 text-sm';
            if (isCore(lang)) {
              return (
                <li key={lang}>
                  <a
                    href={`/digest/${lang}/${weekPath}`}
                    lang={lang}
                    className={`${base} border-brand-700/30 text-brand-800 transition-colors hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                      current ? 'bg-brand-900/10 font-semibold' : ''
                    }`}
                  >
                    {nativeName(lang)}
                  </a>
                </li>
              );
            }
            return (
              <li key={lang}>
                <span lang={lang} className={`${base} border-neutral-300 text-neutral-600`}>
                  {nativeName(lang)}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Primary action (dominant despite position): subscribe. */}
        <div className="mt-6">
          <a
            href={subscribeHref}
            className="inline-block rounded-lg bg-brand-900 px-5 py-2.5 text-sm font-bold text-neutral-50 transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            {labels.subscribe}
          </a>
        </div>

        {/* Tertiary: magazine (FR for now), hidden entirely if no data. */}
        {magazine && (
          <p className="mt-4 text-sm">
            <a href={magazine.href} className="font-medium text-brand-700 underline hover:text-brand-900">
              {labels.magazineCta}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

/** Server component: reads content + i18n, renders the view. Hidden if no complete week. */
export function PublicationsBand({ locale }: { locale: string }) {
  const t = useTranslations('publications');
  const { langs, latestCompleteWeek } = getRecentDigestLangs(2);
  if (!latestCompleteWeek || langs.length === 0) return null;

  const weekNum = latestCompleteWeek.split('-w')[1];
  const frEntry = getDigestEntry(latestCompleteWeek, 'fr');
  // Magazine is FR-only for now (other languages come later) and only shown when
  // that week actually has a magazine block.
  const magazine =
    locale === 'fr' && frEntry?.entry?.magazine
      ? { href: `https://magazine.governance.brussels/s${weekNum}/` }
      : null;

  return (
    <PublicationsBandView
      locale={locale}
      langs={langs}
      latestCompleteWeek={latestCompleteWeek}
      magazine={magazine}
      subscribeHref="#subscribe"
      labels={{
        eyebrow: t('eyebrow'),
        title: t('title'),
        subscribe: t('subscribe'),
        magazineCta: t('magazineCta'),
      }}
    />
  );
}
