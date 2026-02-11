import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { getGlossaryTerms } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
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
  const titles: Record<string, string> = { fr: 'Glossaire', nl: 'Woordenlijst', en: 'Glossary', de: 'Glossar' };
  const descriptions: Record<string, string> = {
    fr: 'Termes clés de la gouvernance bruxelloise expliqués simplement.',
    nl: 'Sleutelbegrippen van het Brusselse bestuur eenvoudig uitgelegd.',
    en: 'Key terms of Brussels governance explained simply.',
    de: 'Schlüsselbegriffe der Brüsseler Regierungsführung einfach erklärt.',
  };
  return buildMetadata({ locale, title: titles[locale] || titles.en, description: descriptions[locale] || descriptions.en, path: '/glossary' });
}

export default async function GlossaryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const terms = getGlossaryTerms(locale as Locale);

  return <GlossaryView terms={terms} />;
}

const CATEGORY_COLORS: Record<string, string> = {
  institution: 'bg-blue-100 text-blue-800',
  procedure: 'bg-indigo-100 text-indigo-800',
  budget: 'bg-amber-100 text-amber-800',
  political: 'bg-slate-100 text-slate-700',
  legal: 'bg-neutral-100 text-neutral-700',
  bgm: 'bg-blue-50 text-blue-700',
};

function GlossaryView({
  terms,
}: {
  terms: ReturnType<typeof getGlossaryTerms>;
}) {
  const t = useTranslations('glossary');
  const tb = useTranslations('breadcrumb');

  // Group terms by category
  const categories = ['institution', 'procedure', 'budget', 'political', 'legal', 'bgm'] as const;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('understand'), href: '/understand' },
          { label: t('title') },
        ]} />

        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="mt-1 mb-8 text-sm text-neutral-500">{t('subtitle')}</p>

        {/* Category filter pills */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const count = terms.filter((term) => term.category === cat).length;
            if (count === 0) return null;
            return (
              <a
                key={cat}
                href={`#cat-${cat}`}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors hover:opacity-80 ${
                  CATEGORY_COLORS[cat]
                }`}
              >
                {t(`categories.${cat}`)}
                <span className="ml-1.5 opacity-60">{count}</span>
              </a>
            );
          })}
        </div>

        {terms.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('noResults')}</p>
        ) : (
          <div className="space-y-10">
            {categories.map((cat) => {
              const catTerms = terms.filter((term) => term.category === cat);
              if (catTerms.length === 0) return null;

              return (
                <div key={cat} id={`cat-${cat}`}>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-neutral-900">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        CATEGORY_COLORS[cat]
                      }`}
                    >
                      {t(`categories.${cat}`)}
                    </span>
                  </h2>

                  <div className="space-y-4">
                    {catTerms.map((term) => (
                      <div
                        key={term.slug}
                        id={term.slug}
                        className="rounded-lg border border-neutral-200 bg-white p-5"
                      >
                        <h3 className="text-base font-semibold text-neutral-900">{term.term}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                          {term.definition}
                        </p>

                        {term.relatedTerms.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-neutral-400">
                              {t('relatedTerms')}:
                            </span>
                            {term.relatedTerms.map((rt) => (
                              <a
                                key={rt}
                                href={`#${rt}`}
                                className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-200"
                              >
                                {rt}
                              </a>
                            ))}
                          </div>
                        )}

                        {term.sources.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-xs font-medium text-neutral-400">
                              {t('sources')}:
                            </span>
                            {term.sources.map((s, i) => (
                              <a
                                key={i}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand-700 underline underline-offset-2 hover:text-brand-900"
                              >
                                {s.label}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
