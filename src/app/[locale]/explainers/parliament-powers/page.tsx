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
    fr: 'Que peut faire le Parlement sans gouvernement ?',
    nl: 'Wat kan het Parlement zonder regering?',
    en: 'What can Parliament do without a government?',
    de: 'Was kann das Parlament ohne Regierung tun?',
  };
  return { title: titles[locale] || titles.en };
}

export default async function ParliamentPowersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ParliamentPowersView />;
}

function ParliamentPowersView() {
  const t = useTranslations('explainers.parliamentPowers');
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
          <h2 className="text-lg font-semibold text-neutral-900">{t('whatItCanDo.title')}</h2>
          <ul className="ml-4 list-disc space-y-2">
            <li>{t('whatItCanDo.questions')}</li>
            <li>{t('whatItCanDo.twelfths')}</li>
            <li>{t('whatItCanDo.commissions')}</li>
            <li>{t('whatItCanDo.hearings')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('whatItCannotDo.title')}</h2>
          <ul className="ml-4 list-disc space-y-2">
            <li>{t('whatItCannotDo.newLaws')}</li>
            <li>{t('whatItCannotDo.budget')}</li>
            <li>{t('whatItCannotDo.policy')}</li>
            <li>{t('whatItCannotDo.appointments')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('twelfths.title')}</h2>
          <p>{t('twelfths.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('realWorld.title')}</h2>
          <p>{t('realWorld.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('concreteActivity.title')}</h2>
          <p>{t('concreteActivity.description')}</p>
          <ul className="ml-4 list-disc space-y-2">
            <li>{t('concreteActivity.twelfthsVoted')}</li>
            <li>{t('concreteActivity.questions')}</li>
            <li>{t('concreteActivity.hearings')}</li>
            <li>{t('concreteActivity.resolutions')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('composition.title')}</h2>
          <p>{t('composition.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('doubleMajorityDetail.title')}</h2>
          <p>{t('doubleMajorityDetail.description')}</p>

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('paradox.title')}</h2>
            <p>{t('paradox.description')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
