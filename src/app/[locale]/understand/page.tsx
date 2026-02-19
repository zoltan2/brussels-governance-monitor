import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import { routing } from '@/i18n/routing';
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
    fr: 'Comprendre la gouvernance bruxelloise',
    nl: 'Het Brusselse bestuur begrijpen',
    en: 'Understanding Brussels governance',
    de: 'Die Brüsseler Regierungsführung verstehen',
  };
  const descriptions: Record<string, string> = {
    fr: 'Des explications pédagogiques sur les institutions bruxelloises, la formation du gouvernement et le suivi des engagements.',
    nl: 'Pedagogische uitleg over de Brusselse instellingen, de regeringsvorming en de opvolging van de engagementen.',
    en: 'Educational explanations about Brussels institutions, government formation and commitment tracking.',
    de: 'Pädagogische Erklärungen zu den Brüsseler Institutionen, der Regierungsbildung und der Verfolgung der Verpflichtungen.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/understand' });
}

export default async function UnderstandPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <UnderstandContent />
    </div>
  );
}

function UnderstandContent() {
  const t = useTranslations('understand');
  const tb = useTranslations('breadcrumb');

  const fundamentals = [
    { href: '/explainers/levels-of-power' as const, title: t('levelsTitle'), desc: t('levelsDesc') },
    { href: '/explainers/government-formation' as const, title: t('formationTitle'), desc: t('formationDesc') },
    { href: '/glossary' as const, title: t('glossaryTitle'), desc: t('glossaryDesc') },
  ];

  const insights = [
    { href: '/explainers/brussels-paradox' as const, title: t('paradoxTitle'), desc: t('paradoxDesc') },
    { href: '/explainers/parliament-powers' as const, title: t('parliamentTitle'), desc: t('parliamentDesc') },
    { href: '/explainers/brussels-cosmopolitan' as const, title: t('cosmopolitanTitle'), desc: t('cosmopolitanDesc') },
  ];

  const institutions = [
    { href: '/explainers/brussels-region' as const, title: t('regionTitle'), desc: t('regionDesc') },
    { href: '/explainers/cocom' as const, title: t('cocomTitle'), desc: t('cocomDesc') },
    { href: '/explainers/cocof' as const, title: t('cocofTitle'), desc: t('cocofDesc') },
    { href: '/explainers/vgc' as const, title: t('vgcTitle'), desc: t('vgcDesc') },
    { href: '/explainers/communities-in-brussels' as const, title: t('communitiesTitle'), desc: t('communitiesDesc') },
    { href: '/explainers/federal-and-brussels' as const, title: t('federalTitle'), desc: t('federalDesc') },
    { href: '/explainers/who-decides-what' as const, title: t('whoDecidesTitle'), desc: t('whoDecidesDesc') },
  ];

  const follow = [
    { href: '/timeline' as const, title: t('timelineTitle'), desc: t('timelineDesc') },
    { href: '/faq' as const, title: t('faqTitle'), desc: t('faqDesc') },
  ];

  return (
    <>
      <Breadcrumb items={[
        { label: tb('home'), href: '/' },
        { label: tb('understand') },
      ]} />

      <h1 className="mb-3 text-2xl font-bold text-neutral-900">{t('title')}</h1>
      <p className="mb-2 text-neutral-600">{t('intro')}</p>
      <p className="mb-10 text-sm text-neutral-500 italic">{t('manifesto')}</p>

      {/* Par où commencer */}
      <section className="mb-10">
        <Link
          href="/explainers/brussels-overview"
          className="block rounded-lg border-2 border-blue-900/20 bg-blue-900/5 p-6 transition-shadow hover:shadow-md"
        >
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-900/60">{t('startLabel')}</p>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('startTitle')}</h2>
          <p className="text-sm text-neutral-600">{t('startDesc')}</p>
        </Link>
      </section>

      {/* Fondamentaux */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('fundamentalsSection')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {fundamentals.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="mb-2 text-base font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Institutions bruxelloises */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('institutionsSection')}</h2>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {institutions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="mb-2 text-base font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Éclairages */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('insightsSection')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {insights.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="mb-2 text-base font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Suivre les engagements */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">{t('followSection')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {follow.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="mb-2 text-base font-semibold text-neutral-900">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
