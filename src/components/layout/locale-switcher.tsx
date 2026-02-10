'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';

/**
 * Resolve a concrete internal pathname (e.g. "/domains/mobility") into
 * the pattern + params format that next-intl's router requires for
 * localized dynamic routes (e.g. { pathname: '/domains/[slug]', params: { slug: 'mobility' } }).
 *
 * Static routes (e.g. "/timeline") are returned as-is.
 */
function resolvePathname(pathname: string) {
  const dynamicRoutes = [
    { pattern: '/domains/[slug]' as const, prefix: '/domains/' },
    { pattern: '/solutions/[slug]' as const, prefix: '/solutions/' },
    { pattern: '/sectors/[slug]' as const, prefix: '/sectors/' },
    { pattern: '/comparisons/[slug]' as const, prefix: '/comparisons/' },
  ];

  for (const { pattern, prefix } of dynamicRoutes) {
    if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
      const slug = pathname.slice(prefix.length);
      return { pathname: pattern, params: { slug } };
    }
  }

  // Static route — return as-is (type-safe for next-intl)
  return pathname as Parameters<ReturnType<typeof useRouter>['replace']>[0];
}

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value as Locale;
    router.replace(resolvePathname(pathname), { locale: nextLocale });
  }

  return (
    <label className="relative">
      <span className="sr-only">{t('switchTo')}</span>
      <select
        defaultValue={locale}
        onChange={onSelectChange}
        className="appearance-none rounded-md border border-neutral-300 bg-white px-3 py-1.5 pr-8 text-sm text-neutral-700 hover:border-neutral-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 focus:outline-none"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}
