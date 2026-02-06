'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

export function Header() {
  const t = useTranslations('nav');

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand-900">
          Brussels Governance Monitor
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('home')}
          </Link>
          <Link href="/#domains" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('domains')}
          </Link>
          <Link href="/#solutions" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('solutions')}
          </Link>
        </nav>

        <LocaleSwitcher />
      </div>
    </header>
  );
}
