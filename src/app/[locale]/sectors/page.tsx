import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getSectorCards } from '@/lib/content';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export default async function SectorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sectorCards = getSectorCards(locale as Locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <SectorsContent sectorCards={sectorCards} />
    </div>
  );
}

function SectorsContent({
  sectorCards,
}: {
  sectorCards: ReturnType<typeof getSectorCards>;
}) {
  const t = useTranslations('sectors');

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
      <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

      <div className="grid gap-6 md:grid-cols-2">
        {sectorCards.map((card) => (
          <Link
            key={card.slug}
            href={{ pathname: '/sectors/[slug]', params: { slug: card.slug } }}
            className="rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
          >
            <h2 className="mb-2 text-base font-semibold text-neutral-900">{card.title}</h2>
            {card.humanImpact && (
              <p className="mb-3 text-sm text-neutral-600">{card.humanImpact}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>
                {card.frozenMechanisms.length} {t('frozenMechanisms').toLowerCase()}
              </span>
              <span>
                {card.activeMechanisms.length} {t('activeMechanisms').toLowerCase()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
