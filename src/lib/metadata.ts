import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const siteName = 'Brussels Governance Monitor';

/**
 * Build full page metadata with OpenGraph + Twitter card.
 * Uses the dynamic OG image route for content pages,
 * or the static og-image.png as fallback.
 */
export function buildMetadata({
  locale,
  title,
  description,
  path,
  ogParams,
}: {
  locale: string;
  title: string;
  description: string;
  path?: string;
  ogParams?: string;
}): Metadata {
  const url = path ? `${siteUrl}/${locale}${path}` : `${siteUrl}/${locale}`;
  const imageUrl = ogParams
    ? `${siteUrl}/${locale}/og?${ogParams}`
    : `${siteUrl}/${locale}/og?title=${encodeURIComponent(title)}`;

  const truncatedDescription =
    description.length > 160 ? description.slice(0, 157) + '...' : description;

  return {
    title,
    description: truncatedDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: truncatedDescription,
      siteName,
      locale,
      type: 'website',
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: truncatedDescription,
      images: [imageUrl],
    },
  };
}
