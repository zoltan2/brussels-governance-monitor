import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { CrisisCounter } from '@/components/crisis-counter';
import { DomainCard } from '@/components/domain-card';
import { SolutionCard } from '@/components/solution-card';
import { SubscribeForm } from '@/components/subscribe-form';
import { getDomainCards, getSolutionCards } from '@/lib/content';
import { formatDate } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const domainCards = getDomainCards(locale as Locale);
  const solutionCards = getSolutionCards(locale as Locale);

  const lastVerified = [...domainCards, ...solutionCards]
    .map((c) => c.lastModified)
    .sort()
    .pop();

  return (
    <>
      <CrisisCounter />

      <DomainsSection domainCards={domainCards} locale={locale} lastVerified={lastVerified} />

      <SolutionsSection solutionCards={solutionCards} />

      <section id="subscribe" className="py-16">
        <div className="mx-auto max-w-md px-4">
          <SubscribeForm />
        </div>
      </section>
    </>
  );
}

function DomainsSection({
  domainCards,
  locale,
  lastVerified,
}: {
  domainCards: ReturnType<typeof getDomainCards>;
  locale: string;
  lastVerified?: string;
}) {
  const t = useTranslations('domains');

  return (
    <section id="domains" className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h2>
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

function SolutionsSection({
  solutionCards,
}: {
  solutionCards: ReturnType<typeof getSolutionCards>;
}) {
  const t = useTranslations('solutions');

  return (
    <section id="solutions" className="bg-neutral-50 py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h2>
        <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="grid gap-6 md:grid-cols-2">
          {solutionCards.map((card) => (
            <SolutionCard key={card.slug} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
