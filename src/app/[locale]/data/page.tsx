import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getDomainCards, getDossierCards } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { CsvDownloadButton, JsonDownloadButton } from '@/components/csv-download-button';
import { SourceRegistry, type RegistrySource } from '@/components/source-registry';
import { Breadcrumb } from '@/components/breadcrumb';
import { buildMetadata } from '@/lib/metadata';
import type { Metadata } from 'next';
import registry from '@/../docs/source-registry.json';

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
    fr: 'Sources, métriques et méthodologie du Brussels Governance Monitor.',
    nl: 'Bronnen, kerncijfers en methodologie van de Brussels Governance Monitor.',
    en: 'Sources, metrics and methodology of the Brussels Governance Monitor.',
    de: 'Quellen, Kennzahlen und Methodik des Brussels Governance Monitor.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/data' });
}

// ---------- Types ----------

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
  cardType: string;
}

interface DossierSection {
  title: string;
  rows: MetricRow[];
}

interface DomainGroup {
  domainKey: string;
  domainTitle: string;
  confidence: string;
  rows: MetricRow[];
  dossiers: DossierSection[];
}

// ---------- Registry data ----------

const registrySources: RegistrySource[] = registry.sources
  .filter((s) => s.name)
  .map((s) => ({
    name: s.name ?? '',
    type: (s.type ?? 'press') as RegistrySource['type'],
    lang: s.lang ?? '',
    category: s.category ?? '',
    enabled: s.enabled ?? true,
    tier: (s.tier ?? 'editorial') as RegistrySource['tier'],
    url: s.url ?? undefined,
  }));

const stats = {
  total: registrySources.length,
  press: registry.stats.byType.press,
  institutional: (registry.stats.byType.institutional ?? 0) + (registry.stats.byType.legal ?? 0) + (registry.stats.byType.agency ?? 0),
  international: (registry.stats.byType.research ?? 0) + (registry.stats.byType['think-tank'] ?? 0),
};

// ---------- Page ----------

export default async function DataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const domainCards = getDomainCards(locale as Locale);
  const dossierCards = getDossierCards(locale as Locale);

  // Build domain groups
  const groupMap = new Map<string, DomainGroup>();

  for (const card of domainCards) {
    if (card.metrics.length === 0) continue;
    const rows: MetricRow[] = card.metrics.map((m) => ({
      domain: card.title.split(':')[0]?.trim() ?? card.title,
      domainTitle: card.title,
      label: m.label,
      value: m.value,
      unit: m.unit || '',
      source: m.source,
      sourceUrl: card.sources[0]?.url ?? '',
      date: m.date,
      confidence: card.confidenceLevel,
      cardType: 'domain',
    }));
    groupMap.set(card.domain, {
      domainKey: card.domain,
      domainTitle: card.title.split(':')[0]?.trim() ?? card.title,
      confidence: card.confidenceLevel,
      rows,
      dossiers: [],
    });
  }

  // Attach dossiers to parent domain
  for (const card of dossierCards) {
    if (card.metrics.length === 0) continue;
    const parentKey = card.relatedDomains[0] ?? 'institutional';
    const rows: MetricRow[] = card.metrics.map((m) => ({
      domain: card.title.split(':')[0]?.trim() ?? card.title,
      domainTitle: card.title,
      label: m.label,
      value: m.value,
      unit: m.unit || '',
      source: m.source,
      sourceUrl: card.sources[0]?.url ?? '',
      date: m.date,
      confidence: card.confidenceLevel,
      cardType: 'dossier',
    }));
    const dossierSection: DossierSection = {
      title: card.title.split(':')[0]?.trim() ?? card.title,
      rows,
    };
    const group = groupMap.get(parentKey);
    if (group) {
      group.dossiers.push(dossierSection);
    } else {
      // Orphan dossier — create its own group
      groupMap.set(parentKey, {
        domainKey: parentKey,
        domainTitle: dossierSection.title,
        confidence: card.confidenceLevel,
        rows: [],
        dossiers: [dossierSection],
      });
    }
  }

  const groups = Array.from(groupMap.values());

  // Flat rows for CSV/JSON export
  const allRows = groups.flatMap((g) => [
    ...g.rows,
    ...g.dossiers.flatMap((d) => d.rows),
  ]);

  return <DataView groups={groups} allRows={allRows} />;
}

// ---------- Confidence badge ----------

const CONFIDENCE_STYLES: Record<string, string> = {
  official: 'bg-teal-50 text-teal-700 border-teal-200',
  estimated: 'bg-amber-50 text-amber-700 border-amber-200',
  unconfirmed: 'bg-neutral-100 text-neutral-500 border-neutral-200',
};

function ConfidenceBadge({ level, label }: { level: string; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[level] ?? CONFIDENCE_STYLES.unconfirmed}`}
    >
      {label}
    </span>
  );
}

// ---------- View ----------

function DataView({
  groups,
  allRows,
}: {
  groups: DomainGroup[];
  allRows: MetricRow[];
}) {
  const t = useTranslations('data');
  const tb = useTranslations('breadcrumb');
  const td = useTranslations('domains');

  const confidenceLabels: Record<string, string> = {
    official: td('confidence.official'),
    estimated: td('confidence.estimated'),
    unconfirmed: td('confidence.unconfirmed'),
  };

  const registryLabels = {
    all: t('registry.all'),
    pressFr: t('registry.pressFr'),
    pressNl: t('registry.pressNl'),
    institutional: t('registry.institutional'),
    international: t('registry.international'),
    search: t('registry.search'),
    showAll: t('registry.showAll'),
    active: t('registry.active'),
    inactive: t('registry.inactive'),
    noResults: t('registry.noResults'),
    typeLabels: {
      institutional: t('registry.typeInstitutional'),
      press: t('registry.typePress'),
      legal: t('registry.typeLegal'),
      agency: t('registry.typeAgency'),
      research: t('registry.typeResearch'),
      'think-tank': t('registry.typeThinkTank'),
    },
    suggestTitle: t('registry.suggestTitle'),
    suggestDescription: t('registry.suggestDescription'),
    suggestUrlLabel: t('registry.suggestUrlLabel'),
    suggestUrlPlaceholder: t('registry.suggestUrlPlaceholder'),
    suggestCommentLabel: t('registry.suggestCommentLabel'),
    suggestCommentPlaceholder: t('registry.suggestCommentPlaceholder'),
    suggestSubmit: t('registry.suggestSubmit'),
    suggestSubmitting: t('registry.suggestSubmitting'),
    suggestSuccess: t('registry.suggestSuccess'),
    suggestError: t('registry.suggestError'),
  };

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('data') },
        ]} />

        {/* ===== SECTION 1 — Methodology ===== */}
        <div className="mb-12">
          <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
          <h2 className="mb-4 text-lg font-semibold text-neutral-800">
            {t('methodology.title')}
          </h2>
          <p className="mb-6 max-w-prose text-sm leading-relaxed text-neutral-600">
            {t('methodology.text', { count: stats.total })}
          </p>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center">
              <p className="text-2xl font-bold text-brand-900">{stats.total}</p>
              <p className="text-xs text-neutral-500">
                {t('methodology.sourcesCount', { count: stats.total }).replace(String(stats.total) + ' ', '')}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center">
              <p className="text-2xl font-bold text-brand-900">{stats.press}</p>
              <p className="text-xs text-neutral-500">
                {t('methodology.pressCount', { count: stats.press }).replace(String(stats.press) + ' ', '')}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center">
              <p className="text-2xl font-bold text-brand-900">{stats.institutional}</p>
              <p className="text-xs text-neutral-500">
                {t('methodology.institutionalCount', { count: stats.institutional }).replace(String(stats.institutional) + ' ', '')}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-center">
              <p className="text-2xl font-bold text-brand-900">{stats.international}</p>
              <p className="text-xs text-neutral-500">
                {t('methodology.internationalCount', { count: stats.international }).replace(String(stats.international) + ' ', '')}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-3 text-sm font-semibold text-neutral-700">
              {t('confidence.title')}
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <ConfidenceBadge level="official" label={confidenceLabels.official} />
                <span className="text-xs text-neutral-500">{t('confidence.official')}</span>
              </div>
              <div className="flex items-start gap-2">
                <ConfidenceBadge level="estimated" label={confidenceLabels.estimated} />
                <span className="text-xs text-neutral-500">{t('confidence.estimated')}</span>
              </div>
              <div className="flex items-start gap-2">
                <ConfidenceBadge level="unconfirmed" label={confidenceLabels.unconfirmed} />
                <span className="text-xs text-neutral-500">{t('confidence.unconfirmed')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== SECTION 2 — Source registry ===== */}
        <div id="sources" className="mb-12 scroll-mt-8">
          <h2 className="mb-2 text-lg font-bold text-neutral-900">
            {t('registry.title')}
          </h2>
          <p className="mb-6 text-sm text-neutral-500">
            {t('registry.subtitle')}
          </p>
          <SourceRegistry sources={registrySources} labels={registryLabels} />
        </div>

        {/* ===== SECTION 3 — Metrics accordions ===== */}
        <div>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{t('metrics.title')}</h2>
              <p className="mt-1 text-sm text-neutral-500">{t('metrics.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <CsvDownloadButton rows={allRows} label={t('downloadCsv')} />
              <JsonDownloadButton rows={allRows} label={t('downloadJson')} />
            </div>
          </div>

          {allRows.length === 0 ? (
            <p className="text-sm text-neutral-500">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => {
                const totalCount = group.rows.length + group.dossiers.reduce((n, d) => n + d.rows.length, 0);
                return (
                  <details
                    key={group.domainKey}
                    className="group rounded-lg border border-neutral-200 bg-white"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                      <svg
                        className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-90"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="flex-1 text-sm font-semibold text-neutral-900">
                        {group.domainTitle}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {t('metrics.nMetrics', { count: totalCount })}
                      </span>
                      <ConfidenceBadge
                        level={group.confidence}
                        label={confidenceLabels[group.confidence] ?? group.confidence}
                      />
                    </summary>

                    <div className="border-t border-neutral-100 px-5 pb-5 pt-3">
                      {/* Domain metrics table */}
                      {group.rows.length > 0 && (
                        <MetricsTable rows={group.rows} t={t} />
                      )}

                      {/* Dossier sub-groups */}
                      {group.dossiers.map((dossier) => (
                        <div key={dossier.title} className="mt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                            {t('metrics.dossier')} — {dossier.title}
                          </p>
                          <MetricsTable rows={dossier.rows} t={t} />
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- Metrics table (reused inside each accordion) ----------

function MetricsTable({
  rows,
  t,
}: {
  rows: MetricRow[];
  t: (key: string) => string;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t('metrics.indicator')}
              </th>
              <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t('metrics.value')}
              </th>
              <th className="w-48 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {t('metrics.source')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="py-2 pr-4 text-sm text-neutral-700">{row.label}</td>
                <td className="whitespace-nowrap py-2 pr-4 text-sm font-semibold text-brand-900">
                  {row.value}
                  {row.unit && (
                    <span className="ml-1 font-normal text-neutral-500">{row.unit}</span>
                  )}
                </td>
                <td className="w-48 max-w-[12rem] py-2">
                  {row.sourceUrl ? (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-xs text-brand-700 underline underline-offset-2 hover:text-brand-900"
                    >
                      {row.source}
                    </a>
                  ) : (
                    <span className="line-clamp-2 text-xs text-neutral-500">{row.source}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-2 md:hidden">
        {rows.map((row, i) => (
          <div key={i} className="rounded-md bg-neutral-50 p-3">
            <p className="text-sm text-neutral-700">{row.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-brand-900">
              {row.value}
              {row.unit && (
                <span className="ml-1 font-normal text-neutral-500">{row.unit}</span>
              )}
            </p>
            {row.sourceUrl ? (
              <a
                href={row.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 block text-xs text-brand-700 underline underline-offset-2 hover:text-brand-900"
              >
                {row.source}
              </a>
            ) : (
              <p className="mt-0.5 text-xs text-neutral-500">{row.source}</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
