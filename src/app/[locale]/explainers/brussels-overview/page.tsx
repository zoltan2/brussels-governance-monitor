import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
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
  const titles: Record<string, string> = { fr: 'Bruxelles en bref', nl: 'Brussel in het kort', en: 'Brussels at a glance', de: 'Brüssel auf einen Blick' };
  const descriptions: Record<string, string> = {
    fr: 'L\'essentiel sur Bruxelles : population, institutions, enjeux et fonctionnement.',
    nl: 'Het essentiële over Brussel: bevolking, instellingen, uitdagingen en werking.',
    en: 'The essentials about Brussels: population, institutions, challenges and how it works.',
    de: 'Das Wesentliche über Brüssel: Bevölkerung, Institutionen, Herausforderungen und Funktionsweise.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/brussels-overview' });
}

export default async function BrusselsOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BrusselsOverviewView />;
}

function BrusselsOverviewView() {
  const t = useTranslations('explainers.brusselsOverview');
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

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>

          {/* Key figures grid */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('keyFigures.title')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-lg font-bold text-brand-900">{t('keyFigures.population')}</p>
                <p className="mt-1 text-xs text-neutral-500">{t('keyFigures.populationDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-lg font-bold text-brand-900">{t('keyFigures.gdp')}</p>
                <p className="mt-1 text-xs text-neutral-500">{t('keyFigures.gdpDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-lg font-bold text-brand-900">{t('keyFigures.parliament')}</p>
                <p className="mt-1 text-xs text-neutral-500">{t('keyFigures.parliamentDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-lg font-bold text-brand-900">{t('keyFigures.governments')}</p>
                <p className="mt-1 text-xs text-neutral-500">{t('keyFigures.governmentsDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="text-lg font-bold text-brand-900">{t('keyFigures.languages')}</p>
                <p className="mt-1 text-xs text-neutral-500">{t('keyFigures.languagesDesc')}</p>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-neutral-900">{t('doubleStatus.title')}</h2>
          <p>{t('doubleStatus.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('complexity.title')}</h2>
          <p>{t('complexity.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('euImpact.title')}</h2>
          <p>{t('euImpact.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('commuterParadox.title')}</h2>
          <p>{t('commuterParadox.description')}</p>

          {/* Go further */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('goFurther')}
            </p>
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/levels-of-power" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkLevels')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/government-formation" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkFormation')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/brussels-paradox" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkParadox')}
                </Link>
              </li>
            </ul>
          </div>

          <p className="text-xs text-neutral-400">{t('sources')}</p>
        </div>
      </div>
    </section>
  );
}
