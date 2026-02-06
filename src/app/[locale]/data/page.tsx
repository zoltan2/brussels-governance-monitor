import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getDomainCards } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/utils';
import { CsvDownloadButton } from '@/components/csv-download-button';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Title is set via template from layout
  const titles: Record<string, string> = {
    fr: 'Données',
    nl: 'Gegevens',
    en: 'Data',
    de: 'Daten',
  };
  return { title: titles[locale] || 'Data' };
}

interface MetricRow {
  domain: string;
  domainTitle: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  date: string;
  confidence: string;
}

export default async function DataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cards = getDomainCards(locale as Locale);

  const rows: MetricRow[] = cards.flatMap((card) =>
    card.metrics.map((m) => ({
      domain: card.domain,
      domainTitle: card.title,
      label: m.label,
      value: m.value,
      unit: m.unit || '',
      source: m.source,
      date: m.date,
      confidence: card.confidenceLevel,
    })),
  );

  return <DataView rows={rows} locale={locale} />;
}

function DataView({ rows, locale }: { rows: MetricRow[]; locale: string }) {
  const t = useTranslations('data');
  const td = useTranslations('domains');

  const confidenceLabels: Record<string, string> = {
    official: td('confidence.official'),
    estimated: td('confidence.estimated'),
    unconfirmed: td('confidence.unconfirmed'),
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {td('backToHome')}
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t('subtitle')}</p>
          </div>
          <CsvDownloadButton rows={rows} label={t('downloadCsv')} />
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('noData')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">{t('domain')}</th>
                  <th className="px-4 py-3">{t('metric')}</th>
                  <th className="px-4 py-3">{t('value')}</th>
                  <th className="px-4 py-3">{t('source')}</th>
                  <th className="px-4 py-3">{t('date')}</th>
                  <th className="px-4 py-3">{t('confidence')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900">
                      {row.domain.charAt(0).toUpperCase() + row.domain.slice(1)}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{row.label}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-900">
                      {row.value}
                      {row.unit && (
                        <span className="ml-1 font-normal text-neutral-400">{row.unit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{row.source}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                      {formatDate(row.date, locale)}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {confidenceLabels[row.confidence] || row.confidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
