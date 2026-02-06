'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';

export function Header() {
  const t = useTranslations('nav');
  const [menuOpen, setMenuOpen] = useState(false);

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
          <LocaleSwitcher />
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
          aria-expanded={menuOpen}
          aria-label="Menu"
        >
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-neutral-100 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              {t('home')}
            </Link>
            <Link
              href="/#domains"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              {t('domains')}
            </Link>
            <Link
              href="/#solutions"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              {t('solutions')}
            </Link>
            <div className="pt-2">
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
