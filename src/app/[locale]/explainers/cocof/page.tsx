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
    fr: 'La COCOF : Commission communautaire française',
    nl: 'De FGC: Franse Gemeenschapscommissie',
    en: 'COCOF: the French Community Commission',
    de: 'Die COCOF: Französische Gemeinschaftskommission',
  };
  const descriptions: Record<string, string> = {
    fr: 'L\'institution francophone de Bruxelles : culture, formation, action sociale.',
    nl: 'De Franstalige instelling van Brussel: cultuur, opleiding, sociale actie.',
    en: 'The French-speaking institution of Brussels: culture, training, social action.',
    de: 'Die französischsprachige Institution Brüssels: Kultur, Ausbildung, Sozialarbeit.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/cocof' });
}

export default async function CocofPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CocofView />;
}

function CocofView() {
  const t = useTranslations('explainers.cocof');
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

          <h2 className="text-lg font-semibold text-neutral-900">{t('budget.title')}</h2>
          <p>{t('budget.description')}</p>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/vgc" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkVgc')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/cocom" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkCocom')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
