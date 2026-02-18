import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
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
  const titles: Record<string, string> = { fr: 'Charte éditoriale', nl: 'Redactioneel charter', en: 'Editorial Charter', de: 'Redaktionelle Charta' };
  const descriptions: Record<string, string> = {
    fr: 'Charte éditoriale du Brussels Governance Monitor : neutralité factuelle, sources obligatoires, distinction faits et interprétations, droit de réponse, indépendance politique.',
    nl: 'Redactioneel charter van de Brussels Governance Monitor: feitelijke neutraliteit, verplichte bronnen, onderscheid feiten en interpretaties, recht van antwoord, politieke onafhankelijkheid.',
    en: 'Editorial charter of the Brussels Governance Monitor: factual neutrality, mandatory sources, distinction between facts and interpretation, right of reply, political independence.',
    de: 'Redaktionelle Charta des Brussels Governance Monitor: sachliche Neutralität, Quellenpflicht, Unterscheidung von Fakten und Interpretationen, Recht auf Gegendarstellung, politische Unabhängigkeit.',
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
  const tb = useTranslations('breadcrumb');
  const td = useTranslations('domains');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('transparency'), href: '/transparency' },
          { label: tb('editorial') },
        ]} />

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
          <p>
            <Link href="/methodology" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
              {t('verification.seeMethod')}
            </Link>
          </p>

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
          <p>
            <Link href="/methodology" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
              {t('confidence.seeMethod')}
            </Link>
          </p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('corrections.title')}</h2>
          <p>{t('corrections.description')}</p>

          <h2 className="text-lg font-semibold text-neutral-900">{t('independence.title')}</h2>
          <p>{t('independence.description')}</p>

          <p className="mt-8 text-xs text-neutral-500">
            {t('lastUpdated', { date: '2026-02-06' })}
          </p>
        </div>
      </div>
    </section>
  );
}
