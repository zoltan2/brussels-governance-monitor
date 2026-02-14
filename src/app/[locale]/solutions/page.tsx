import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getSolutionCards } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
import { SolutionCard } from '@/components/solution-card';
import { routing, type Locale } from '@/i18n/routing';
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
    fr: 'Solutions de sortie de crise (archives)',
    nl: 'Oplossingen voor de crisis (archief)',
    en: 'Crisis exit solutions (archives)',
    de: 'Lösungen für die Krise (Archiv)',
  };
  const descriptions: Record<string, string> = {
    fr: 'Les scénarios de sortie de crise envisagés avant la formation du gouvernement bruxellois. Contenu archivé.',
    nl: 'De crisisscenario\'s die werden overwogen vóór de vorming van de Brusselse regering. Gearchiveerde inhoud.',
    en: 'Crisis exit scenarios considered before the formation of the Brussels government. Archived content.',
    de: 'Krisenszenarien, die vor der Bildung der Brüsseler Regierung in Betracht gezogen wurden. Archivierter Inhalt.',
  };
  return {
    ...buildMetadata({
      locale,
      title: titles[locale] || titles.en,
      description: descriptions[locale] || descriptions.en,
      path: '/solutions',
    }),
    robots: { index: false, follow: true },
  };
}

export default async function SolutionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const solutionCards = getSolutionCards(locale as Locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <SolutionsContent solutionCards={solutionCards} />
    </div>
  );
}

function SolutionsContent({
  solutionCards,
}: {
  solutionCards: ReturnType<typeof getSolutionCards>;
}) {
  const t = useTranslations('solutions');
  const tb = useTranslations('breadcrumb');

  return (
    <>
      <Breadcrumb items={[
        { label: tb('home'), href: '/' },
        { label: tb('solutions') },
      ]} />

      <div className="mb-6 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
        <p className="text-sm text-neutral-600">
          {t('archiveBanner')}
        </p>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
      <p className="mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

      <div className="grid gap-6 md:grid-cols-2">
        {solutionCards.map((card) => (
          <SolutionCard key={card.slug} card={card} />
        ))}
      </div>
    </>
  );
}
