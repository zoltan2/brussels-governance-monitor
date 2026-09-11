// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import digestLanguages from '../../../../config/digest-languages.json';
import {
  getAllDigestWeeks,
  getAllDigestLangs,
  getDigestEntry,
  getLatestDigestWeek,
} from '@/lib/content';

export const metadata: Metadata = {
  title: 'Weekly Digest — Brussels Governance Monitor',
  description:
    'Weekly summary of Brussels governance, in French, Dutch, English, German and other languages. Making governance accessible to all Brussels residents.',
};

interface LanguageGroup {
  label: string;
  languages: typeof digestLanguages;
}

function groupLanguages(): LanguageGroup[] {
  const euOfficial = [
    'fr', 'nl', 'en', 'de', 'it', 'es', 'pt', 'pl', 'ro', 'el',
    'bg', 'cs', 'da', 'et', 'fi', 'ga', 'hr', 'hu', 'lt', 'lv',
    'mt', 'sk', 'sl', 'sv',
  ];
  const african = [
    'sw', 'am', 'ha', 'ig', 'yo', 'zu', 'xh', 'af', 'so', 'ti',
    'rw', 'ln', 'mg', 'wo',
  ];
  const asian = [
    'ja', 'zh', 'ko', 'hi', 'bn', 'th', 'vi', 'id', 'ms', 'tl',
    'ta', 'te', 'ml', 'kn', 'gu', 'pa', 'mr', 'ne', 'si', 'my',
    'km', 'lo',
  ];
  const middleEast = ['ar', 'tr', 'fa', 'he', 'ur', 'ps', 'ku', 'ckb'];
  const otherEurope = ['ru', 'uk', 'sq', 'sr', 'bs', 'ka', 'hy', 'az'];
  const centralAsia = ['kk', 'uz', 'mn'];

  const groups: LanguageGroup[] = [
    {
      label: 'EU Official Languages',
      languages: digestLanguages.filter((l) => euOfficial.includes(l.code)),
    },
    {
      label: 'Middle East & Turkey',
      languages: digestLanguages.filter((l) => middleEast.includes(l.code)),
    },
    {
      label: 'African Languages',
      languages: digestLanguages.filter((l) => african.includes(l.code)),
    },
    {
      label: 'Asian Languages',
      languages: digestLanguages.filter((l) => asian.includes(l.code)),
    },
    {
      label: 'Other European',
      languages: digestLanguages.filter((l) => otherEurope.includes(l.code)),
    },
    {
      label: 'Central Asian',
      languages: digestLanguages.filter((l) => centralAsia.includes(l.code)),
    },
  ];

  return groups.filter((g) => g.languages.length > 0);
}

export default function DigestIndexPage() {
  const latestWeek = getLatestDigestWeek();
  const allWeeks = getAllDigestWeeks();
  // Les pastilles mènent à la dernière édition : une langue n'est « disponible »
  // que si cette édition existe dans sa langue. Sinon la page affiche le
  // français (repli), et l'annonce comptait 78 langues pour 11 éditions réelles.
  const availableLangs = latestWeek
    ? getAllDigestLangs().filter((code) => getDigestEntry(latestWeek, code)?.isFallback === false)
    : [];
  const groups = groupLanguages();

  if (!latestWeek) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">Weekly Digest</h1>
        <p className="mt-4 text-neutral-600">
          No digest editions available yet. Check back soon.
        </p>
      </div>
    );
  }

  const [year, weekNum] = latestWeek.split('-w');
  const soon = digestLanguages.filter((l) => !availableLangs.includes(l.code));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-neutral-900">
          Weekly Digest
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Weekly summary of Brussels governance, available in{' '}
          {digestLanguages.filter((l) => availableLangs.includes(l.code)).length} languages.
          Choose your language below to read the latest edition.
        </p>
      </div>

      {/* Latest edition */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-neutral-800">
          Latest edition: Week {weekNum} ({year})
        </h2>

        {/* Verified languages (FR/NL/EN/DE) */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Human-verified translations
          </p>
          <div className="flex flex-wrap gap-2">
            {['fr', 'nl', 'en', 'de'].map((code) => {
              const lang = digestLanguages.find((l) => l.code === code);
              if (!lang || !availableLangs.includes(code)) return null;
              return (
                <a
                  key={code}
                  href={`/digest/${code}/${year}/w${weekNum}`}
                  lang={code}
                  className="rounded-md border border-brand-700 bg-brand-900 px-3 py-1.5 text-sm font-medium text-neutral-50 hover:bg-brand-800"
                >
                  {lang.native_name}
                </a>
              );
            })}
          </div>
        </div>

        {/* Available languages by group. Languages without an edition are listed
            once, below, under a visible heading: a greyed pill with a title
            attribute was the only hint, invisible to touch, keyboard and
            screen readers. */}
        {groups.map((group) => {
          const available = group.languages.filter(
            (lang) => !['fr', 'nl', 'en', 'de'].includes(lang.code) && availableLangs.includes(lang.code),
          );
          if (available.length === 0) return null;
          return (
            <div key={group.label} className="mb-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {available.map((lang) => (
                  <a
                    key={lang.code}
                    href={`/digest/${lang.code}/${year}/w${weekNum}`}
                    lang={lang.code}
                    dir={lang.rtl ? 'rtl' : undefined}
                    className="rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-800 hover:border-brand-700 hover:text-brand-900"
                  >
                    {lang.native_name}
                  </a>
                ))}
              </div>
            </div>
          );
        })}

        {soon.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Not yet available for this edition ({soon.length} languages)
            </h3>
            <p className="text-sm text-neutral-600">
              {soon.map((lang, i) => (
                <span key={lang.code}>
                  <span lang={lang.code} dir={lang.rtl ? 'rtl' : undefined}>
                    {lang.native_name}
                  </span>
                  {i < soon.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </p>
          </div>
        )}
      </section>

      {/* Previous editions */}
      {allWeeks.length > 1 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-neutral-800">
            Previous editions
          </h2>
          <ul className="space-y-4">
            {allWeeks.slice(1).map((week) => {
              const [y, wn] = week.split('-w');
              return (
                <li key={week} className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-neutral-700">
                    Week {wn} ({y})
                  </span>
                  {['fr', 'nl', 'en', 'de'].map((code) =>
                    availableLangs.includes(code) ? (
                      <a
                        key={code}
                        href={`/digest/${code}/${y}/w${wn}`}
                        className="rounded border border-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600 hover:border-brand-700 hover:text-brand-900"
                      >
                        {code.toUpperCase()}
                      </a>
                    ) : null,
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
