'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';

export function LocaleSwitcher() {
  const t = useTranslations('locale');
  const locale = useLocale();
  const router = useRouter();
  // usePathname() returns the INTERNAL route pattern (e.g. '/domains/[slug]')
  const pathname = usePathname();
  // useParams() returns the ACTUAL param values (e.g. { slug: 'mobility' })
  const params = useParams();

  function onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = e.target.value as Locale;
    const slug = typeof params?.slug === 'string' ? params.slug : undefined;

    if (slug) {
      // Dynamic route: pathname is already the pattern '/domains/[slug]'
      // Pass it with actual slug value from useParams()
      router.replace(
        { pathname, params: { slug } } as Parameters<typeof router.replace>[0],
        { locale: nextLocale },
      );
    } else {
      // Static route: pathname is the internal key like '/glossary'
      router.replace(
        pathname as Parameters<typeof router.replace>[0],
        { locale: nextLocale },
      );
    }
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
