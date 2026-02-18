import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
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
    fr: 'À propos',
    nl: 'Over ons',
    en: 'About',
    de: 'Über uns',
  };
  const descriptions: Record<string, string> = {
    fr: "Qui est derrière le Brussels Governance Monitor : un outil indépendant de suivi de la gouvernance bruxelloise, créé par Zoltán Jánosi. Formations et conseil en IA et communication factuelle.",
    nl: 'Wie zit er achter de Brussels Governance Monitor: een onafhankelijk instrument voor het opvolgen van het Brusselse bestuur, opgericht door Zoltán Jánosi. Opleidingen en advies in AI en feitelijke communicatie.',
    en: 'Who is behind the Brussels Governance Monitor: an independent tool for monitoring Brussels governance, created by Zoltán Jánosi. Training and consulting in AI and factual communication.',
    de: 'Wer steht hinter dem Brussels Governance Monitor: ein unabhängiges Instrument zur Überwachung der Brüsseler Regierungsführung, gegründet von Zoltán Jánosi. Schulungen und Beratung in KI und faktenbasierter Kommunikation.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/about',
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('about');
  const tb = await getTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('transparency'), href: '/transparency' },
          { label: tb('about') },
        ]} />

        <h1 className="mb-8 text-2xl font-bold text-neutral-900">{t('title')}</h1>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
          <p className="text-base">{t('intro')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('contextTitle')}</h2>
          <p>{t('contextText')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('whatTitle')}</h2>
          <p>{t('whatText')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('approachTitle')}</h2>
          <p>{t('approachText')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('whoTitle')}</h2>
          <p>{t('whoText')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('servicesTitle')}</h2>
          <p>{t('servicesText')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('contactTitle')}</h2>
          <p>{t('contactText')}</p>
          <p>
            {t('contactFallback')}{' '}
            <a
              href={`mailto:${t('contactEmail')}`}
              className="font-medium text-brand-700 hover:text-brand-900"
            >
              {t('contactEmail')}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
