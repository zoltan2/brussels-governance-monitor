import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { getChangelog } from '@/lib/changelog';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import type { Locale } from '@/i18n/routing';
import type { Metadata } from 'next';
import type { ChangelogEntry } from '@/lib/changelog';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const titles: Record<string, string> = {
  fr: 'Historique des modifications',
  nl: 'Wijzigingsgeschiedenis',
  en: 'Changelog',
  de: 'Änderungsprotokoll',
};

const descriptions: Record<string, string> = {
  fr: 'Toutes les mises à jour du contenu du Brussels Governance Monitor.',
  nl: 'Alle inhoudsupdates van de Brussels Governance Monitor.',
  en: 'All content updates to the Brussels Governance Monitor.',
  de: 'Alle Inhaltsaktualisierungen des Brussels Governance Monitor.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/changelog',
  });
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const entries = getChangelog(locale as Locale);

  return <ChangelogView entries={entries} locale={locale} />;
}

const typeBadgeClasses: Record<ChangelogEntry['type'], string> = {
  added: 'bg-blue-100 text-blue-800',
  updated: 'bg-slate-100 text-slate-700',
  corrected: 'bg-amber-100 text-amber-800',
  removed: 'bg-neutral-200 text-neutral-600',
};

function ChangelogView({ entries, locale }: { entries: ChangelogEntry[]; locale: string }) {
  const t = useTranslations('changelog');
  const td = useTranslations('domains');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {td('backToHome')}
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('pageTitle')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('pageSubtitle')}</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="pb-2 pr-4 font-medium">{t('date')}</th>
                <th className="pb-2 pr-4 font-medium">{t('type')}</th>
                <th className="pb-2 pr-4 font-medium">{t('section')}</th>
                <th className="pb-2 font-medium">{t('description')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.map((entry, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 align-top whitespace-nowrap text-neutral-400">
                    <time dateTime={entry.date}>{formatDate(entry.date, locale)}</time>
                  </td>
                  <td className="py-2.5 pr-4 align-top">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeClasses[entry.type]}`}
                    >
                      {t(`types.${entry.type}`)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 align-top whitespace-nowrap text-neutral-500">
                    {t(`sections.${entry.section}`)}
                  </td>
                  <td className="py-2.5 align-top text-neutral-700">{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
