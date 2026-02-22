import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Metadata } from 'next';

const DOMAIN_KEYS = [
  'budget',
  'mobility',
  'housing',
  'employment',
  'climate',
  'social',
  'security',
  'economy',
  'cleanliness',
  'institutional',
  'urban-planning',
  'digital',
  'education',
] as const;

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
    fr: 'Qui décide quoi à Bruxelles ?',
    nl: 'Wie beslist wat in Brussel?',
    en: 'Who decides what in Brussels?',
    de: 'Wer entscheidet was in Brüssel?',
  };
  const descriptions: Record<string, string> = {
    fr: 'La matrice des compétences : quelle institution gère quel domaine pour les Bruxellois.',
    nl: 'De bevoegdheidsmatrix: welke instelling beheert welk domein voor de Brusselaars.',
    en: 'The competence matrix: which institution manages which domain for Brussels residents.',
    de: 'Die Zuständigkeitsmatrix: welche Institution verwaltet welchen Bereich für die Brüsseler.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/explainers/who-decides-what' });
}

export default async function WhoDecidesWhatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WhoDecidesWhatView />;
}

function WhoDecidesWhatView() {
  const t = useTranslations('explainers.whoDecidesWhatPage');
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

          {/* Competence matrix */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('matrix.title')}</h2>
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">{t('matrix.title')}</caption>
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold text-neutral-900">{t('matrix.domain')}</th>
                    <th scope="col" className="px-3 py-2 font-semibold text-neutral-900">{t('matrix.primaryEntity')}</th>
                    <th scope="col" className="px-3 py-2 font-semibold text-neutral-900">{t('matrix.otherEntities')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {DOMAIN_KEYS.map((key) => (
                    <tr key={key}>
                      <td className="px-3 py-2 font-medium">{t(`matrix.rows.${key}.domain`)}</td>
                      <td className="px-3 py-2">{t(`matrix.rows.${key}.primary`)}</td>
                      <td className="px-3 py-2 text-neutral-500">{t(`matrix.rows.${key}.others`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-neutral-900">{t('howToRead.title')}</h2>
          <p>{t('howToRead.description')}</p>

          {/* Coverage circles */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('circles.title')}</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <p>{t('circles.circle1')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p>{t('circles.circle2')}</p>
              </div>
              <div className="rounded-lg border border-neutral-100 bg-white p-4">
                <p className="text-neutral-500">{t('circles.circle3')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <ul className="space-y-2">
              <li>
                <Link href="/explainers/levels-of-power" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkLevels')}
                </Link>
              </li>
              <li>
                <Link href="/explainers/brussels-region" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
                  {t('linkRegion')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
