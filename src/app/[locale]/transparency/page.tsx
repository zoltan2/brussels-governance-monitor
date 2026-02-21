import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Link } from '@/i18n/navigation';
import { Breadcrumb } from '@/components/breadcrumb';
import { FeedbackButton } from '@/components/feedback-button';
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
    fr: 'Transparence',
    nl: 'Transparantie',
    en: 'Transparency',
    de: 'Transparenz',
  };
  const descriptions: Record<string, string> = {
    fr: "Comment le Brussels Governance Monitor garantit la fiabilité de ses contenus : ligne éditoriale, méthodologie, financement, accessibilité.",
    nl: 'Hoe de Brussels Governance Monitor de betrouwbaarheid van zijn inhoud garandeert: redactionele lijn, methodologie, financiering, toegankelijkheid.',
    en: 'How the Brussels Governance Monitor ensures the reliability of its content: editorial policy, methodology, funding, accessibility.',
    de: 'Wie der Brussels Governance Monitor die Zuverlässigkeit seiner Inhalte sicherstellt: Redaktionslinie, Methodik, Finanzierung, Barrierefreiheit.',
  };
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/transparency',
  });
}

export default async function TransparencyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('transparency');
  const tb = await getTranslations('breadcrumb');
  const tFeedback = await getTranslations('feedback');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('transparency') },
        ]} />

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mb-10 text-base text-neutral-600">{t('intro')}</p>

        <div className="space-y-6">
          {/* Ligne éditoriale */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('editorialTitle')}</h2>
            <p className="mb-3 text-sm text-neutral-600">{t('editorialSummary')}</p>
            <Link
              href="/editorial"
              className="text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              {t('readMore')}
            </Link>
          </div>

          {/* Méthodologie */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('methodologyTitle')}</h2>
            <p className="mb-3 text-sm text-neutral-600">{t('methodologySummary')}</p>
            <Link
              href="/methodology"
              className="text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              {t('readMore')}
            </Link>
          </div>

          {/* Accessibilité */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('accessibilityTitle')}</h2>
            <p className="mb-3 text-sm text-neutral-600">{t('accessibilitySummary')}</p>
            <Link
              href="/accessibility"
              className="text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              {t('readMore')}
            </Link>
          </div>

          {/* Code source */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('sourceTitle')}</h2>
            <p className="mb-3 text-sm text-neutral-600">{t('sourceSummary')}</p>
            <a
              href={t('sourceLink')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              GitHub &rarr;
            </a>
          </div>

          {/* Protection des visiteurs */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('securityTitle')}</h2>
            <p className="mb-3 text-sm text-neutral-600">{t('securityIntro')}</p>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex gap-2">
                <span className="shrink-0 text-brand-700" aria-hidden="true">&bull;</span>
                <span>{t('securityNoTracker')}</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-brand-700" aria-hidden="true">&bull;</span>
                <span>{t('securityAnalytics')}</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-brand-700" aria-hidden="true">&bull;</span>
                <span>{t('securitySri')}</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-brand-700" aria-hidden="true">&bull;</span>
                <span>{t('securityHttps')}</span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-brand-700" aria-hidden="true">&bull;</span>
                <span>{t('securityHosting')}</span>
              </li>
            </ul>
          </div>

          {/* Qui est derrière le BGM */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('aboutTitle')}</h2>
            <p className="mb-3 text-sm text-neutral-600">{t('aboutText')}</p>
            <Link
              href="/about"
              className="text-sm font-medium text-brand-700 hover:text-brand-900"
            >
              {t('aboutLink')}
            </Link>
          </div>

          {/* Financement */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('fundingTitle')}</h2>
            <p className="text-sm text-neutral-600">{t('fundingText')}</p>
          </div>

          {/* Politique de correction */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('correctionTitle')}</h2>
            <p className="text-sm text-neutral-600">
              {t('correctionText')}{' '}
              <Link
                href="/changelog"
                className="font-medium text-brand-700 hover:text-brand-900"
              >
                {t('readMore')}
              </Link>
            </p>
          </div>

          {/* Contact */}
          <div className="rounded-lg border border-neutral-200 p-6">
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{t('contactTitle')}</h2>
            <p className="mb-3 text-sm text-neutral-600">{t('contactText')}</p>
            <div className="mb-3">
              <FeedbackButton
                cardTitle={t('title')}
                cardType="page"
                cardSlug="transparency"
                labels={{
                  button: tFeedback('button'),
                  title: tFeedback('title'),
                  typeLabel: tFeedback('typeLabel'),
                  types: {
                    error: tFeedback('types.error'),
                    correction: tFeedback('types.correction'),
                    source: tFeedback('types.source'),
                    other: tFeedback('types.other'),
                  },
                  messageLabel: tFeedback('messageLabel'),
                  messagePlaceholder: tFeedback('messagePlaceholder'),
                  emailLabel: tFeedback('emailLabel'),
                  emailPlaceholder: tFeedback('emailPlaceholder'),
                  submit: tFeedback('submit'),
                  submitting: tFeedback('submitting'),
                  success: tFeedback('success'),
                  errorMessage: tFeedback('errorMessage'),
                  cancel: tFeedback('cancel'),
                }}
              />
            </div>
            <p className="text-sm text-neutral-600">
              <a
                href={`mailto:${t('contactEmail')}`}
                className="font-medium text-brand-700 hover:text-brand-900"
              >
                {t('contactEmail')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
