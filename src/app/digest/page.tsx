import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import digestLanguages from '../../../config/digest-languages.json';
import {
  getAllDigestWeeks,
  getAllDigestLangs,
  getLatestDigestWeek,
} from '@/lib/content';

export const metadata: Metadata = {
  title: 'Weekly Digest — Brussels Governance Monitor',
  description:
    'Weekly summary of Brussels governance, available in 78 languages. Making governance accessible to all Brussels residents.',
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
  const availableLangs = getAllDigestLangs();
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-neutral-900">
          Weekly Digest
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Weekly summary of Brussels governance, available in{' '}
          {digestLanguages.length} languages. Choose your language below to read
          the latest edition.
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
                  className="rounded-md border border-brand-700 bg-brand-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
                >
                  {lang.native_name}
                </a>
              );
            })}
          </div>
        </div>

        {/* All languages by group */}
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.languages.map((lang) => {
                const isVerified = ['fr', 'nl', 'en', 'de'].includes(lang.code);
                if (isVerified) return null;
                const isAvailable = availableLangs.includes(lang.code);
                if (!isAvailable) {
                  return (
                    <span
                      key={lang.code}
                      className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-400"
                      title={`${lang.name} — coming soon`}
                    >
                      {lang.native_name}
                    </span>
                  );
                }
                return (
                  <a
                    key={lang.code}
                    href={`/digest/${lang.code}/${year}/w${weekNum}`}
                    className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:border-brand-700 hover:text-brand-900"
                  >
                    {lang.native_name}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Previous editions */}
      {allWeeks.length > 1 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-neutral-800">
            Previous editions
          </h2>
          <ul className="space-y-2">
            {allWeeks.slice(1).map((week) => {
              const [y, wn] = week.split('-w');
              return (
                <li key={week}>
                  <a
                    href={`/digest/fr/${y}/w${wn}`}
                    className="text-sm text-brand-700 underline underline-offset-2 hover:text-brand-900"
                  >
                    Week {wn} ({y})
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
