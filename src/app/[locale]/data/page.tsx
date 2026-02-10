import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getDomainCards, getAllSources, type AggregatedSource } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { formatDate } from '@/lib/utils';
import { CsvDownloadButton, JsonDownloadButton } from '@/components/csv-download-button';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import { buildMetadata } from '@/lib/metadata';
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
  const titles: Record<string, string> = {
    fr: 'Données',
    nl: 'Gegevens',
    en: 'Data',
    de: 'Daten',
  };
  const descriptions: Record<string, string> = {
    fr: 'Téléchargez toutes les métriques du Brussels Governance Monitor en format ouvert (CSV, JSON).',
    nl: 'Download alle kerncijfers van de Brussels Governance Monitor in open formaat (CSV, JSON).',
    en: 'Download all Brussels Governance Monitor metrics in open format (CSV, JSON).',
    de: 'Laden Sie alle Kennzahlen des Brussels Governance Monitor im offenen Format herunter (CSV, JSON).',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/data' });
}

interface MetricRow {
  domain: string;
  domainTitle: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  sourceUrl: string;
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
    card.metrics.map((m) => {
      // Find matching source URL from card sources
      // Handle slash-separated source names (e.g. "SLRB / VRT")
      const sourceParts = m.source.split(/\s*\/\s*/);
      const matchingSource = card.sources.find((s) => {
        const labelLower = s.label.toLowerCase();
        const labelPrefix = s.label.split('—')[0].trim().toLowerCase();
        return (
          labelLower.includes(m.source.toLowerCase()) ||
          m.source.toLowerCase().includes(labelPrefix) ||
          sourceParts.some(
            (part) =>
              labelLower.includes(part.trim().toLowerCase()) ||
              part.trim().toLowerCase().includes(labelPrefix),
          )
        );
      });

      return {
        domain: card.domain,
        domainTitle: card.title,
        label: m.label,
        value: m.value,
        unit: m.unit || '',
        source: m.source,
        sourceUrl: matchingSource?.url || '',
        date: m.date,
        confidence: card.confidenceLevel,
      };
    }),
  );

  // Aggregate sources from ALL content types
  const allSources = getAllSources(locale as Locale);

  return <DataView rows={rows} sources={allSources} locale={locale} />;
}

function DataView({
  rows,
  sources,
  locale,
}: {
  rows: MetricRow[];
  sources: AggregatedSource[];
  locale: string;
}) {
  const t = useTranslations('data');
  const tb = useTranslations('breadcrumb');
  const td = useTranslations('domains');

  const confidenceLabels: Record<string, string> = {
    official: td('confidence.official'),
    estimated: td('confidence.estimated'),
    unconfirmed: td('confidence.unconfirmed'),
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('data') },
        ]} />

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <CsvDownloadButton rows={rows} label={t('downloadCsv')} />
            <JsonDownloadButton rows={rows} label={t('downloadJson')} />
          </div>
        </div>

        {/* Metrics table */}
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
                    <td className="px-4 py-3 text-neutral-500">
                      {row.sourceUrl ? (
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                        >
                          {row.source}
                        </a>
                      ) : (
                        row.source
                      )}
                    </td>
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

        {/* Full sources reference */}
        {sources.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-bold text-neutral-900">{t('sourcesTitle')}</h2>
            <p className="mb-6 text-sm text-neutral-500">{t('sourcesSubtitle')}</p>
            <div className="space-y-3">
              {sources.map((s, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900">{s.label}</p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-500">{t(`sourceType.${s.contentType}`)}</span>
                        {' '}{s.contentTitle} · {td('accessedAt', { date: formatDate(s.accessedAt, locale) })}
                      </p>
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-neutral-50 hover:text-brand-900"
                    >
                      <svg
                        className="mr-1 inline-block h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      {t('openSource')}
                    </a>
                  </div>
                  <p className="mt-1 truncate text-xs text-neutral-400">{s.url}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
