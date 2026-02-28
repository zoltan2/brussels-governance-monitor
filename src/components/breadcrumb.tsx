// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Link, getPathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import type { ComponentProps } from 'react';
import type { Locale } from '@/i18n/routing';

type LinkHref = ComponentProps<typeof Link>['href'];
type PathHref = Parameters<typeof getPathname>[0]['href'];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const locale = useLocale() as Locale;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href
        ? { item: `${siteUrl}${getPathname({ locale, href: item.href as PathHref })}` }
        : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="breadcrumb mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <span className="text-neutral-300" aria-hidden="true">
                    &gt;
                  </span>
                )}
                {isLast || !item.href ? (
                  <span aria-current={isLast ? 'page' : undefined} className="text-neutral-700">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href as LinkHref} className="hover:text-neutral-700">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
