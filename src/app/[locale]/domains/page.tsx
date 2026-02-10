import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getDomainCards } from '@/lib/content';
import { DomainCard } from '@/components/domain-card';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import type { Locale } from '@/i18n/routing';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const titles: Record<string, string> = {
  fr: 'Domaines impactés',
  nl: 'Getroffen domeinen',
  en: 'Impacted domains',
  de: 'Betroffene Bereiche',
};

const descriptions: Record<string, string> = {
  fr: 'Ce qui est bloqué, retardé ou dégradé faute de gouvernement bruxellois.',
  nl: 'Wat geblokkeerd, vertraagd of verslechterd is door het ontbreken van een Brusselse regering.',
  en: 'What is blocked, delayed or degraded without a Brussels government.',
  de: 'Was ohne Brüsseler Regierung blockiert, verzögert oder verschlechtert ist.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/domains',
  });
}

export default async function DomainsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const domainCards = getDomainCards(locale as Locale);

  return <DomainsView domainCards={domainCards} locale={locale} />;
}

function DomainsView({
  domainCards,
  locale,
}: {
  domainCards: ReturnType<typeof getDomainCards>;
  locale: string;
}) {
  const t = useTranslations('domains');

  const lastVerified = domainCards
    .map((c) => c.lastModified)
    .sort()
    .pop();

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Link
          href="/"
          className="mb-6 inline-flex items-center text-sm text-neutral-500 hover:text-neutral-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('backToHome')}
        </Link>

        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
            <p className="text-sm text-neutral-500">{t('subtitle')}</p>
          </div>
          {lastVerified && (
            <p className="text-xs text-neutral-400">
              {t('lastModified', { date: formatDate(lastVerified, locale) })}
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {domainCards.map((card) => (
            <DomainCard key={card.slug} card={card} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
