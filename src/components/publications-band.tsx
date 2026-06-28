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
  magazine: { tagline: string; href: string } | null;
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

        {/* Grid: the 4 core (fr/nl/en/de) are real LINKS with a clear interactive
            affordance (brand-bordered pill, hover fill, pointer, focus ring; current
            locale = filled). The 7 extras are muted PROOF text: no pill border, no hover,
            visibly non-clickable. All carry lang= for screen-reader pronunciation. */}
        <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label={title}>
          {ordered.map((lang) => {
            const current = lang === locale;
            if (isCore(lang)) {
              return (
                <li key={lang}>
                  <a
                    href={`/digest/${lang}/${weekPath}`}
                    lang={lang}
                    className={`inline-block rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                      current
                        ? 'border-brand-700 bg-brand-700 text-neutral-50'
                        : 'border-brand-700 text-brand-700 hover:bg-brand-700 hover:text-neutral-50'
                    }`}
                  >
                    {nativeName(lang)}
                  </a>
                </li>
              );
            }
            return (
              <li key={lang}>
                <span lang={lang} className="px-1 py-1 text-sm text-neutral-500">
                  {nativeName(lang)}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Primary action: subscribe. SOLID neutral fill = the only real button, dominant
            and dark-safe: neutral-900 (fill) and neutral-50 (text) both swap, so it stays
            ~21:1 in light AND dark. A brand fill would go pale/washed-out in dark. */}
        <div className="mt-6">
          <a
            href={subscribeHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-bold text-neutral-50 transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            {labels.subscribe}
          </a>
        </div>

        {/* Tertiary: magazine (FR for now), hidden if no data. ONE discreet muted line:
            label/link FIRST, then the week's tagline inline. Never louder than S'abonner:
            small, secondary-text token, no hero italic. tagline + link from the same issue. */}
        {magazine && (
          <p className="mt-4 text-sm text-neutral-500">
            <a href={magazine.href} className="font-medium text-brand-700 hover:underline">
              {labels.magazineCta}
            </a>
            {' · '}
            <span>« {magazine.tagline} »</span>
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
  const mag = locale === 'fr' ? frEntry?.entry?.magazine : null;
  const magazine = mag?.tagline
    ? { tagline: mag.tagline, href: `https://magazine.governance.brussels/s${weekNum}/` }
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
