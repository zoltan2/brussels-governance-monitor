import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import digestLanguages from '../../../../../../config/digest-languages.json';
import {
  getDigestEntry,
  getAllDigestWeeks,
  getAllDigestLangs,
  getAdjacentDigestWeeks,
} from '@/lib/content';
import { MdxContent } from '@/components/mdx-content';

interface DigestPageProps {
  params: Promise<{ lang: string; year: string; week: string }>;
}

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

export async function generateMetadata({
  params,
}: DigestPageProps): Promise<Metadata> {
  const { lang, year, week } = await params;
  const weekKey = `${year}-${week.replace('w', 'w')}`;
  const result = getDigestEntry(weekKey, lang);

  if (!result) {
    return { title: 'Digest not found' };
  }

  const langInfo = digestLanguages.find((l) => l.code === lang);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

  return {
    title: result.entry.title,
    description: `Brussels Governance Monitor — Weekly digest ${week} ${year} (${langInfo?.name || lang})`,
    alternates: {
      canonical: `${siteUrl}/digest/${lang}/${year}/${week}`,
    },
    openGraph: {
      title: result.entry.title,
      type: 'article',
      locale: lang,
    },
    robots: {
      index: true,
      follow: true,
    },
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
      <div className="border-b border-neutral-100 bg-neutral-50">
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
                    ? 'bg-brand-900 text-white'
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

      <article className="mx-auto max-w-3xl px-4 py-10">
        {/* Title */}
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">
          {entry.title}
        </h1>

        {/* Meta line */}
        <div className="mb-8 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
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
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                Auto-translated
              </span>
            </>
          )}
        </div>

        {/* Fallback banner */}
        {isFallback && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This digest is not yet available in{' '}
            {langInfo?.name || lang}. Showing the French version.
          </div>
        )}

        {/* MDX content */}
        <div className="prose-digest">
          <MdxContent code={entry.content} />
        </div>

        {/* Disclaimer */}
        <div className="mt-10 space-y-3 border-t border-neutral-200 pt-6">
          {entry.auto_translated && (
            <p className="text-xs text-neutral-500">
              This content was automatically translated. The original version
              is in French.{' '}
              <Link
                href={`/digest/fr/${year}/${week}`}
                className="text-brand-700 underline"
              >
                Read the French version
              </Link>
              .
            </p>
          )}
          <p className="text-xs text-neutral-500">
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
          <nav className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-6">
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
