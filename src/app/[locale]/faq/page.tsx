import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
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
  const titles: Record<string, string> = { fr: 'Questions fréquentes', nl: 'Veelgestelde vragen', en: 'FAQ', de: 'Häufig gestellte Fragen' };
  const descriptions: Record<string, string> = {
    fr: 'Réponses aux questions les plus fréquentes sur le Brussels Governance Monitor.',
    nl: 'Antwoorden op de meest gestelde vragen over de Brussels Governance Monitor.',
    en: 'Answers to the most frequently asked questions about the Brussels Governance Monitor.',
    de: 'Antworten auf die häufigsten Fragen zum Brussels Governance Monitor.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/faq' });
}

/** q1-q7: current situation + general BGM. q8-q13: historical crisis section. */
const CURRENT_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'] as const;
const CRISIS_KEYS = ['q8', 'q9', 'q10', 'q11', 'q12', 'q13'] as const;
const ALL_KEYS = [...CURRENT_KEYS, ...CRISIS_KEYS];

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
  const t = await getTranslations('faq');

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ALL_KEYS.map((key) => {
      const num = key.slice(1);
      return {
        '@type': 'Question',
        name: t(`questions.${key}`),
        acceptedAnswer: {
          '@type': 'Answer',
          text: t(`questions.a${num}`),
        },
      };
    }),
    url: `${siteUrl}/${locale}/faq`,
    inLanguage: locale,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqView />
    </>
  );
}

function FaqItem({ questionKey, t }: { questionKey: string; t: ReturnType<typeof useTranslations<'faq'>> }) {
  const num = questionKey.slice(1);
  return (
    <details className="group rounded-lg border border-neutral-200 bg-white">
      <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-neutral-900 select-none hover:bg-neutral-50">
        <span className="ml-1">{t(`questions.${questionKey}`)}</span>
      </summary>
      <div className="border-t border-neutral-100 px-5 py-4 text-sm leading-relaxed text-neutral-600">
        {t(`questions.a${num}`)}
      </div>
    </details>
  );
}

function FaqView() {
  const t = useTranslations('faq');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-1 mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        <div className="space-y-4">
          {CURRENT_KEYS.map((key) => (
            <FaqItem key={key} questionKey={key} t={t} />
          ))}
        </div>

        {/* Historical crisis section */}
        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t('crisisSectionTitle')}
          </h2>
          <div className="space-y-4">
            {CRISIS_KEYS.map((key) => (
              <FaqItem key={key} questionKey={key} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
