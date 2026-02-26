import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getArchivePage, getAllArchiveSlugs } from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { FallbackBanner } from '@/components/fallback-banner';
import { MdxContent } from '@/components/mdx-content';
import { TableOfContents } from '@/components/table-of-contents';
import { Breadcrumb } from '@/components/breadcrumb';
import { useTranslations } from 'next-intl';

export function generateStaticParams() {
  const slugs = getAllArchiveSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const result = getArchivePage(slug, locale as Locale);
  if (!result) return {};

  const { page } = result;
  return buildMetadata({
    locale,
    title: page.title,
    description: page.summary,
    path: `/archives/${slug}`,
  });
}

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = getArchivePage(slug, locale as Locale);
  if (!result) notFound();

  const { page, isFallback } = result;

  return <ArchiveDetail page={page} locale={locale} isFallback={isFallback} />;
}

const periodLabels: Record<string, string> = {
  fr: 'Contenu archive',
  nl: 'Gearchiveerde inhoud',
  en: 'Archived content',
  de: 'Archivierter Inhalt',
};

function ArchiveDetail({
  page,
  locale,
  isFallback,
}: {
  page: ReturnType<typeof getArchivePage> extends { page: infer P } | null ? P : never;
  locale: string;
  isFallback: boolean;
}) {
  const tb = useTranslations('breadcrumb');

  return (
    <article className="py-12">
      <div className="mx-auto max-w-5xl px-4">
        <Breadcrumb items={[
          { label: tb('home'), href: '/' },
          { label: periodLabels[locale] ?? periodLabels.fr },
          { label: page.title },
        ]} />

        {isFallback && <FallbackBanner targetLocale={locale} />}

        <div className="mt-4 mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">{page.title}</h1>
          <p className="mt-2 text-base leading-relaxed text-neutral-600">{page.summary}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {page.period}
          </div>
        </div>

        <TableOfContents locale={locale} />

        <div className="mt-4" data-mdx-content {...(isFallback && page.locale !== locale ? { lang: page.locale } : {})}>
          <MdxContent code={page.content} />
        </div>
      </div>
    </article>
  );
}
