import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Breadcrumb } from '@/components/breadcrumb';
import { CommitmentsDashboard, type CommitmentsData } from '@/components/commitments-dashboard';
import { buildMetadata } from '@/lib/metadata';
import commitmentsData from '@/../data/commitments.json';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const titles: Record<string, string> = {
  fr: 'Engagements',
  nl: 'Engagementen',
  en: 'Commitments',
  de: 'Verpflichtungen',
};

const descriptions: Record<string, string> = {
  fr: 'Suivi des engagements chiffrés de la Déclaration de Politique Régionale bruxelloise.',
  nl: 'Opvolging van de cijfermatige engagementen uit de Brusselse Gewestelijke Beleidsverklaring.',
  en: 'Tracking the quantified commitments from the Brussels Regional Policy Declaration.',
  de: 'Verfolgung der bezifferten Verpflichtungen der Brüsseler Regionalen Politikerklärung.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: titles[locale] || titles.fr,
    description: descriptions[locale] || descriptions.fr,
    locale,
    path: '/dashboard',
  });
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <DashboardContent locale={locale} />
    </div>
  );
}

function DashboardContent({ locale }: { locale: string }) {
  const t = useTranslations('dashboard');
  const tb = useTranslations('breadcrumb');

  return (
    <>
      <Breadcrumb items={[
        { label: tb('home'), href: '/' },
        { label: tb('dashboard') },
      ]} />

      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-sm text-neutral-500">{t('subtitle')}</p>
      </div>

      <CommitmentsDashboard data={commitmentsData as CommitmentsData} locale={locale} />
    </>
  );
}
