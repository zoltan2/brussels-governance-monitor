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
  const titles: Record<string, string> = { fr: 'Le paradoxe bruxellois : riche en PIB, pauvre en revenus', nl: 'De Brusselse paradox: rijk aan bbp, arm aan inkomsten', en: 'The Brussels paradox: GDP-rich, income-poor', de: 'Das Brüsseler Paradox: reich am BIP, arm an Einkommen' };
  const descriptions: Record<string, string> = {
    fr: 'Bruxelles produit 20% du PIB belge mais ses habitants sont parmi les plus pauvres du pays.',
    nl: 'Brussel produceert 20% van het Belgische bbp, maar de inwoners behoren tot de armsten van het land.',
    en: 'Brussels produces 20% of Belgian GDP but its residents are among the poorest in the country.',
    de: 'Brüssel erzeugt 20% des belgischen BIP, aber seine Einwohner gehören zu den ärmsten des Landes.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/brussels-paradox' });
}

export default async function BrusselsParadoxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BrusselsParadoxView />;
}

function BrusselsParadoxView() {
  const t = useTranslations('explainers.brusselsParadox');
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

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900">{t('gdp.title')}</h2>
          <p>{t('gdp.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('commuters.title')}</h2>
          <p>{t('commuters.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('income.title')}</h2>
          <p>{t('income.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('transfers.title')}</h2>
          <p>{t('transfers.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('whyMatters.title')}</h2>
          <p>{t('whyMatters.description')}</p>
        </div>
      </div>
    </section>
  );
}
