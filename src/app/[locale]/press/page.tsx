import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Breadcrumb } from '@/components/breadcrumb';
import { getPressMentions } from '@/lib/press';
import { formatDate } from '@/lib/utils';
import { buildMetadata } from '@/lib/metadata';
import type { Locale } from '@/i18n/routing';
import type { Metadata } from 'next';
import type { PressMention } from '@/lib/press';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const titles: Record<string, string> = {
  fr: 'Revue de presse',
  nl: 'Persoverzicht',
  en: 'Press coverage',
  de: 'Pressespiegel',
};

const descriptions: Record<string, string> = {
  fr: 'Ils parlent de governance.brussels — articles, citations et mentions dans la presse.',
  nl: 'Zij schrijven over governance.brussels — artikelen, citaten en vermeldingen in de pers.',
  en: 'They write about governance.brussels — articles, citations and press mentions.',
  de: 'Sie berichten über governance.brussels — Artikel, Zitate und Erwähnungen in der Presse.',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    title: titles[locale] || titles.en,
    description: descriptions[locale] || descriptions.en,
    path: '/press',
  });
}

export default async function PressPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const mentions = getPressMentions(locale as Locale);

  return <PressView mentions={mentions} locale={locale} />;
}

const typeBadgeClasses: Record<PressMention['type'], string> = {
  feature: 'bg-blue-100 text-blue-800',
  citation: 'bg-slate-100 text-slate-700',
  mention: 'bg-amber-100 text-amber-800',
};

function PressView({ mentions, locale }: { mentions: PressMention[]; locale: string }) {
  const t = useTranslations('press');
  const tb = useTranslations('breadcrumb');

  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: tb('press') },
        ]} />

        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('pageTitle')}</h1>
        <p className="mb-8 text-sm text-neutral-500">{t('pageSubtitle')}</p>

        <p className="mb-8 text-sm leading-relaxed text-neutral-600">{t('intro')}</p>

        <div className="space-y-4">
          {mentions.map((mention, i) => (
            <article
              key={i}
              className="rounded-lg border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300"
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <time dateTime={mention.date} className="text-xs text-neutral-500">
                  {formatDate(mention.date, locale)}
                </time>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeClasses[mention.type]}`}
                >
                  {t(`types.${mention.type}`)}
                </span>
                <span className="text-xs font-semibold text-neutral-700">{mention.outlet}</span>
              </div>

              <h2 className="text-sm font-medium text-neutral-900">
                <a
                  href={mention.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-800 hover:underline"
                >
                  {mention.title}
                  <span className="ml-1 text-neutral-400" aria-hidden="true">&#8599;</span>
                </a>
              </h2>

              {mention.author && (
                <p className="mt-1 text-xs text-neutral-500">
                  {t('by')} {mention.author}
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
