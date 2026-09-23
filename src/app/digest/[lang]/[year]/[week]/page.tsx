// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import digestLanguages from '../../../../../../config/digest-languages.json';
import {
  getDigestEntry,
  getAllDigestWeeks,
  getAllDigestLangs,
  getAdjacentDigestWeeks,
  isIndexableDigestEdition,
} from '@/lib/content';
import { MdxContent } from '@/components/mdx-content';
import { MagazineLink } from '@/components/magazine-link';
import { getDigestNotice } from '@/lib/digest-notice';
import { truncateDescription } from '@/lib/metadata';

interface DigestPageProps {
  params: Promise<{ lang: string; year: string; week: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  const weeks = getAllDigestWeeks();
  const langs = getAllDigestLangs();

  return weeks.flatMap((week) => {
    const [year, weekNum] = week.split('-w');
    return langs.map((lang) => ({
      lang,
      year,
      week: `w${weekNum}`,
    }));
  });
}

/** Heading and first paragraph of the excerpt, joined as running text. */
function excerptToDescription(excerpt: string): string {
  const text = excerpt
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/[.!?:…]$/.test(line) ? line : `${line}.`))
    .join(' ');
  return truncateDescription(text);
}

export async function generateMetadata({
  params,
}: DigestPageProps): Promise<Metadata> {
  const { lang, year, week } = await params;
  const weekKey = `${year}-${week.replace('w', 'w')}`;
  const result = getDigestEntry(weekKey, lang);

  if (!result) {
    return { title: 'Digest not found' };
  }

  const { entry, isFallback } = result;
  const langInfo = digestLanguages.find((l) => l.code === lang);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
  const pageUrl = (code: string) => `${siteUrl}/digest/${code}/${year}/${week}`;
  const indexable = isIndexableDigestEdition(result);

  // Auto-translated titles are a bare "BGM Digest — Week 37", identical in seven
  // languages: the language name tells the tabs and share cards apart.
  const title =
    entry.auto_translated && langInfo ? `${entry.title} · ${langInfo.native_name}` : entry.title;
  const description = excerptToDescription(entry.excerpt);

  const languages: Record<string, string> = {};
  if (indexable) {
    for (const code of getAllDigestLangs()) {
      const edition = getDigestEntry(weekKey, code);
      if (edition && isIndexableDigestEdition(edition)) languages[code] = pageUrl(code);
    }
    if (languages.fr) languages['x-default'] = languages.fr;
  }

  const imageUrl = `${siteUrl}/${entry.redirect_lang}/og?title=${encodeURIComponent(entry.title)}`;

  return {
    // Absolute: the layout template would add "| BGM Digest" to a title that
    // already starts with "BGM Digest".
    title: { absolute: title },
    description,
    alternates: {
      // A fallback page is the French edition under another URL: point to it.
      canonical: isFallback ? pageUrl('fr') : pageUrl(lang),
      ...(indexable ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      type: 'article',
      locale: lang,
      url: pageUrl(lang),
      siteName: 'Brussels Governance Monitor',
      publishedTime: entry.generated_at,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: entry.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function DigestDetailPage({ params }: DigestPageProps) {
  const { lang, year, week } = await params;
  const weekKey = `${year}-${week.replace('w', 'w')}`;
  const result = getDigestEntry(weekKey, lang);

  if (!result) {
    notFound();
  }

  const { entry, isFallback } = result;
  const langInfo = digestLanguages.find((l) => l.code === lang);

  const verifiedLangs = ['fr', 'nl', 'en', 'de'];
  // L'habillage de la page est en anglais, de gauche à droite : il le déclare
  // quand la page ne l'est pas. Une édition non traduite affiche le texte
  // français : il le déclare aussi, et la page sort de l'index de recherche de
  // la langue demandée, où elle apparaissait comme une page anglaise ou arabe.
  const chrome = lang === 'en' ? {} : { lang: 'en', dir: 'ltr' as const };
  const contentLang = isFallback ? { lang: 'fr', dir: 'ltr' as const } : {};
  const availableLangs = getAllDigestLangs();

  // Adjacent weeks for prev/next navigation
  const { prev, next } = getAdjacentDigestWeeks(weekKey);
  const prevUrl = prev
    ? `/digest/${lang}/${prev.split('-w')[0]}/w${prev.split('-w')[1]}`
    : null;
  const nextUrl = next
    ? `/digest/${lang}/${next.split('-w')[0]}/w${next.split('-w')[1]}`
    : null;

  return (
    <>
      {/* Language navigation bar */}
      <div className="border-b border-neutral-100 bg-neutral-50" data-pagefind-ignore="all" {...chrome}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <span className="text-xs text-neutral-500">Read in:</span>
          {verifiedLangs.map((code) => {
            if (!availableLangs.includes(code)) return null;
            const isActive = code === lang;
            return (
              <Link
                key={code}
                href={`/digest/${code}/${year}/${week}`}
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  isActive
                    ? 'bg-brand-900 text-neutral-50'
                    : 'text-neutral-600 hover:text-brand-900'
                }`}
              >
                {code.toUpperCase()}
              </Link>
            );
          })}
          <Link
            href="/digest"
            className="text-xs text-neutral-500 hover:text-neutral-700"
            style={{ marginInlineStart: 'auto' }}
          >
            All languages &rarr;
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10" data-pagefind-ignore={isFallback ? 'all' : undefined}>
        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-neutral-900" {...contentLang}>
          {entry.title}
        </h1>

        {/* Meta line */}
        <div className="mb-8 flex flex-wrap items-center gap-3 text-xs text-neutral-500" data-pagefind-ignore="all" {...chrome}>
          {langInfo && (
            <span>
              {langInfo.native_name} ({langInfo.name})
            </span>
          )}
          <span>&middot;</span>
          <span>
            Week {week.replace('w', '')} &middot; {year}
          </span>
          {entry.auto_translated && (
            <>
              <span>&middot;</span>
              <span className="rounded bg-warning-bg px-1.5 py-0.5 text-warning-fg">
                {getDigestNotice(lang).badge}
              </span>
            </>
          )}
        </div>

        {/* Fallback banner */}
        {isFallback && (
          <div className="mb-6 rounded-md border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-fg" {...chrome}>
            This digest is not yet available in{' '}
            {langInfo?.name || lang}. Showing the French version.
          </div>
        )}

        {/* Magazine link */}
        {entry.magazine ? (
          <div className="mb-8">
            <MagazineLink
              weekShort={`s${entry.week.split('-w')[1]}`}
              lang={lang}
            />
          </div>
        ) : null}

        {/* MDX content */}
        <div className="prose-digest" {...contentLang}>
          <MdxContent code={entry.content} />
        </div>

        {/* Disclaimer */}
        <div className="mt-10 space-y-3 border-t border-neutral-200 pt-6">
          {entry.auto_translated && (
            <p className="text-xs text-neutral-500">
              {getDigestNotice(lang).disclaimer}{' '}
              <Link
                href={`/digest/fr/${year}/${week}`}
                className="text-brand-700 underline"
              >
                {getDigestNotice(lang).readFrench}
              </Link>
              .
            </p>
          )}
          <p className="text-xs text-neutral-500" data-pagefind-ignore="all" {...chrome}>
            Source:{' '}
            <a
              href="https://governance.brussels"
              className="text-brand-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Brussels Governance Monitor
            </a>{' '}
            &mdash; independent civic monitoring of Brussels governance.
          </p>
        </div>

        {/* Prev/Next navigation */}
        {(prevUrl || nextUrl) && (
          <nav className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-6" data-pagefind-ignore="all" {...chrome}>
            {prevUrl ? (
              <Link
                href={prevUrl}
                className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-brand-900"
              >
                <span aria-hidden="true">&larr;</span>
                <span>
                  Week {prev!.split('-w')[1]}
                </span>
              </Link>
            ) : (
              <span />
            )}
            <Link
              href="/digest"
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              All editions
            </Link>
            {nextUrl ? (
              <Link
                href={nextUrl}
                className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-brand-900"
              >
                <span>
                  Week {next!.split('-w')[1]}
                </span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </article>
    </>
  );
}
