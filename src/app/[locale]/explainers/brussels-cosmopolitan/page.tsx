import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
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
  const titles: Record<string, string> = { fr: 'Bruxelles cosmopolite', nl: 'Kosmopolitisch Brussel', en: 'Cosmopolitan Brussels', de: 'Kosmopolitisches Brüssel' };
  const descriptions: Record<string, string> = {
    fr: 'La diversité de Bruxelles en chiffres : nationalités, langues et démographie.',
    nl: 'De diversiteit van Brussel in cijfers: nationaliteiten, talen en demografie.',
    en: 'Brussels diversity in numbers: nationalities, languages and demographics.',
    de: 'Die Vielfalt Brüssels in Zahlen: Nationalitäten, Sprachen und Demografie.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/brussels-cosmopolitan' });
}

export default async function BrusselsCosmopolitanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BrusselsCosmopolitanView />;
}

function BrusselsCosmopolitanView() {
  const t = useTranslations('explainers.brusselsCosmopolitan');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('euCapital.title')}</h2>
          <p>{t('euCapital.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('internationalOrgs.title')}</h2>
          <p>{t('internationalOrgs.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('fiscalImpact.title')}</h2>
          <p>{t('fiscalImpact.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('superdiversity.title')}</h2>
          <p>{t('superdiversity.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('dutchStatus.title')}</h2>
          <p>{t('dutchStatus.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('demographicChallenge.title')}</h2>
          <p>{t('demographicChallenge.description')}</p>

          {/* Go further */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {t('goFurther')}
            </p>
            <ul className="space-y-2">
              <li>
                <Link href={{ pathname: '/domains/[slug]', params: { slug: 'employment' } }} className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkEmployment')}
                </Link>
              </li>
              <li>
                <Link href={{ pathname: '/domains/[slug]', params: { slug: 'social' } }} className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkSocial')}
                </Link>
              </li>
              <li>
                <Link href={{ pathname: '/domains/[slug]', params: { slug: 'housing' } }} className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkHousing')}
                </Link>
              </li>
            </ul>
          </div>

          <p className="text-xs text-neutral-500">{t('sources')}</p>
        </div>
      </div>
    </section>
  );
}
