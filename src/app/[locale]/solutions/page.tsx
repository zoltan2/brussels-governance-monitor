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
    fr: 'Solutions de sortie de crise',
    nl: 'Oplossingen voor de crisis',
    en: 'Crisis exit solutions',
    de: 'Lösungen für die Krise',
  };
  const descriptions: Record<string, string> = {
    fr: 'Les voies de sortie réalistes pour la crise gouvernementale bruxelloise, documentées et sourcées.',
    nl: 'Realistische oplossingen voor de Brusselse regeringscrisis, gedocumenteerd en met bronnen.',
    en: 'Realistic exit paths for the Brussels government crisis, documented and sourced.',
    de: 'Realistische Auswege aus der Brüsseler Regierungskrise, dokumentiert und mit Quellen belegt.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/solutions',
  });
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
