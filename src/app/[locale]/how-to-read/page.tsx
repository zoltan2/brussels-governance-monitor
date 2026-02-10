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
  const titles: Record<string, string> = { fr: 'Comment lire ce site', nl: 'Hoe deze site lezen', en: 'How to read this site', de: 'Wie diese Seite lesen' };
  const descriptions: Record<string, string> = {
    fr: 'Guide pratique pour comprendre les fiches, statuts et données du Brussels Governance Monitor.',
    nl: 'Praktische gids om de fiches, statussen en gegevens van de Brussels Governance Monitor te begrijpen.',
    en: 'Practical guide to understanding the cards, statuses and data of the Brussels Governance Monitor.',
    de: 'Praktischer Leitfaden zum Verständnis der Karten, Status und Daten des Brussels Governance Monitor.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/how-to-read' });
}

export default async function HowToReadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HowToReadView />;
}

function HowToReadView() {
  const t = useTranslations('howToRead');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('howToRead') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-700">
          <p className="text-base">{t('intro')}</p>

          {/* Statuts */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">{t('statusTitle')}</h2>
            <p className="mb-3">{t('statusIntro')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="inline-block rounded-full bg-status-blocked px-2.5 py-0.5 text-xs font-medium text-white">
                  {t('statusBlocked')}
                </span>
                <p className="mt-2 text-xs">{t('statusBlockedDesc')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="inline-block rounded-full bg-status-delayed px-2.5 py-0.5 text-xs font-medium text-white">
                  {t('statusDelayed')}
                </span>
                <p className="mt-2 text-xs">{t('statusDelayedDesc')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="inline-block rounded-full bg-status-ongoing px-2.5 py-0.5 text-xs font-medium text-white">
                  {t('statusOngoing')}
                </span>
                <p className="mt-2 text-xs">{t('statusOngoingDesc')}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <span className="inline-block rounded-full bg-status-resolved px-2.5 py-0.5 text-xs font-medium text-white">
                  {t('statusResolved')}
                </span>
                <p className="mt-2 text-xs">{t('statusResolvedDesc')}</p>
              </div>
            </div>
          </div>

          {/* Niveaux de confiance */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">{t('confidenceTitle')}</h2>
            <p className="mb-3">{t('confidenceIntro')}</p>
            <div className="space-y-3">
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="font-medium text-brand-700">{t('confidenceOfficialLabel')}</p>
                <p className="mt-1 text-xs">{t('confidenceOfficialDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="font-medium text-status-delayed">{t('confidenceEstimatedLabel')}</p>
                <p className="mt-1 text-xs">{t('confidenceEstimatedDesc')}</p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <p className="font-medium text-neutral-400">{t('confidenceUnconfirmedLabel')}</p>
                <p className="mt-1 text-xs">{t('confidenceUnconfirmedDesc')}</p>
              </div>
            </div>
          </div>

          {/* Comprendre les fiches */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">{t('cardsTitle')}</h2>
            <p className="mb-3">{t('cardsIntro')}</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>{t('cardsStatus')}</li>
              <li>{t('cardsMetrics')}</li>
              <li>{t('cardsAnalysis')}</li>
              <li>{t('cardsSources')}</li>
              <li>{t('cardsVerification')}</li>
            </ul>
          </div>

          {/* Lecture facile */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('falcTitle')}</h2>
            <p>{t('falcDesc')}</p>
          </div>

          {/* Chronologie */}
          <div>
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('timelineTitle')}</h2>
            <p>{t('timelineDesc')}</p>
          </div>

          {/* Pour aller plus loin */}
          <div>
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">{t('moreTitle')}</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <Link
                  href="/methodology"
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                >
                  {t('moreMethodology')}
                </Link>
              </li>
              <li>
                <Link
                  href="/explainers/levels-of-power"
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                >
                  {t('moreExplainers')}
                </Link>
              </li>
              <li>
                <Link
                  href="/data"
                  className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
                >
                  {t('moreData')}
                </Link>
              </li>
            </ul>
          </div>

          <p className="mt-4 text-xs text-neutral-400">
            {t('lastUpdated', { date: '2026-02-08' })}
          </p>
        </div>
      </div>
    </section>
  );
}
