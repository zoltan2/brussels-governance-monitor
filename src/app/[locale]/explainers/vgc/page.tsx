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
  const titles: Record<string, string> = {
    fr: 'La VGC : Vlaamse Gemeenschapscommissie',
    nl: 'De VGC: Vlaamse Gemeenschapscommissie',
    en: 'VGC: the Flemish Community Commission',
    de: 'Die VGC: Flämische Gemeinschaftskommission',
  };
  const descriptions: Record<string, string> = {
    fr: 'L\'institution néerlandophone de Bruxelles : culture, enseignement, bien-être.',
    nl: 'De Nederlandstalige instelling van Brussel: cultuur, onderwijs, welzijn.',
    en: 'The Dutch-speaking institution of Brussels: culture, education, welfare.',
    de: 'Die niederländischsprachige Institution Brüssels: Kultur, Bildung, Wohlfahrt.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/vgc' });
}

export default async function VgcPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <VgcView />;
}

function VgcView() {
  const t = useTranslations('explainers.vgc');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <p>{t('intro')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('governance.title')}</h2>
          <p>{t('governance.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('competences.title')}</h2>
          <p>{t('competences.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('flemishLink.title')}</h2>
          <p>{t('flemishLink.description')}</p>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/cocof" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkCocof')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/communities-in-brussels" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkCommunities')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
