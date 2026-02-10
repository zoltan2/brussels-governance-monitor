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
  const titles: Record<string, string> = { fr: 'Charte éditoriale', nl: 'Redactioneel charter', en: 'Editorial Charter', de: 'Redaktionelle Charta' };
  const descriptions: Record<string, string> = {
    fr: 'Nos principes éditoriaux : neutralité, sources vérifiées, transparence.',
    nl: 'Onze redactionele principes: neutraliteit, geverifieerde bronnen, transparantie.',
    en: 'Our editorial principles: neutrality, verified sources, transparency.',
    de: 'Unsere redaktionellen Grundsätze: Neutralität, verifizierte Quellen, Transparenz.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/editorial' });
}

export default async function EditorialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <EditorialView />;
}

function EditorialView() {
  const t = useTranslations('editorial');
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

          <h2 className="text-lg font-semibold text-neutral-900">{t('principles.title')}</h2>
          <ul className="ml-4 list-disc space-y-2">
            <li>{t('principles.neutrality')}</li>
            <li>{t('principles.sources')}</li>
            <li>{t('principles.factOpinion')}</li>
            <li>{t('principles.transparency')}</li>
            <li>{t('principles.noPartisan')}</li>
            <li>{t('principles.rightOfReply')}</li>
          </ul>

          <h2 className="text-lg font-semibold text-neutral-900">{t('verification.title')}</h2>
          <p>{t('verification.description')}</p>

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

          <h2 className="text-lg font-semibold text-neutral-900">{t('corrections.title')}</h2>
          <p>{t('corrections.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('independence.title')}</h2>
          <p>{t('independence.description')}</p>

          <p className="mt-8 text-xs text-neutral-400">
            {t('lastUpdated', { date: '2026-02-06' })}
          </p>
        </div>
      </div>
    </section>
  );
}
