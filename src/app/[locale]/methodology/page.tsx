import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
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
  const titles: Record<string, string> = {
    fr: 'Notre méthode',
    nl: 'Onze methode',
    en: 'Our Method',
    de: 'Unsere Methode',
  };
  return { title: titles[locale] || 'Our Method' };
}

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MethodologyView />;
}

function MethodologyView() {
  const t = useTranslations('methodology');
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

        <h1 className="mb-8 text-2xl font-bold text-neutral-900">{t('title')}</h1>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('dataSources.title')}</h2>
          <p>{t('dataSources.description')}</p>
          <ul className="ml-4 list-disc space-y-2">
            <li><strong>{t('dataSources.tierA')}</strong> — {t('dataSources.tierADesc')}</li>
            <li><strong>{t('dataSources.tierB')}</strong> — {t('dataSources.tierBDesc')}</li>
            <li><strong>{t('dataSources.tierC')}</strong> — {t('dataSources.tierCDesc')}</li>
            <li><strong>{t('dataSources.tierD')}</strong> — {t('dataSources.tierDDesc')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('verification.title')}</h2>
          <p>{t('verification.description')}</p>
          <ul className="ml-4 list-disc space-y-2">
            <li>{t('verification.doubleSource')}</li>
            <li>{t('verification.dateCheck')}</li>
            <li>{t('verification.contextCheck')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('confidence.title')}</h2>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>{td('confidence.official')}</strong> — {t('confidence.officialDesc')}
            </li>
            <li>
              <strong>{td('confidence.estimated')}</strong> — {t('confidence.estimatedDesc')}
            </li>
            <li>
              <strong>{td('confidence.unconfirmed')}</strong> — {t('confidence.unconfirmedDesc')}
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('limitations.title')}</h2>
          <ul className="ml-4 list-disc space-y-2">
            <li>{t('limitations.noPrediction')}</li>
            <li>{t('limitations.noScoring')}</li>
            <li>{t('limitations.noExhaustive')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('independence.title')}</h2>
          <p>{t('independence.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('corrections.title')}</h2>
          <p>{t('corrections.description')}</p>
          <ul className="ml-4 list-disc space-y-2">
            <li><strong>{t('corrections.minor')}</strong> — {t('corrections.minorDesc')}</li>
            <li><strong>{t('corrections.substantial')}</strong> — {t('corrections.substantialDesc')}</li>
            <li><strong>{t('corrections.retraction')}</strong> — {t('corrections.retractionDesc')}</li>
          </ul>

          <p className="mt-8 text-xs text-neutral-400">
            {t('lastUpdated', { date: '2026-02-07' })}
          </p>
        </div>
      </div>
    </section>
  );
}
