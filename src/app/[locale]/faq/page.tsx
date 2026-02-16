import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
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

const QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const;

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <FaqView />;
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

        <div className="space-y-6">
          {QUESTION_KEYS.map((key) => (
            <details
              key={key}
              className="group rounded-lg border border-neutral-200 bg-white"
            >
              <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-neutral-900 select-none hover:bg-neutral-50">
                <span className="ml-1">{t(`questions.${key}`)}</span>
              </summary>
              <div className="border-t border-neutral-100 px-5 py-4 text-sm leading-relaxed text-neutral-600">
                {t(`questions.a${key.slice(1)}`)}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
