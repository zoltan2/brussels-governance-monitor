'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { Search } from '@/components/search';

export function Header() {
  const t = useTranslations('nav');
  const th = useTranslations('home');
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand-900">
          Brussels Governance Monitor
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          <a href={`/${locale}/#domains`} className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('domains')}
          </a>

          {/* Comprendre dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              {t('understand')}
              <svg
                className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-neutral-200 bg-white py-2 shadow-lg">
                <Link
                  href="/timeline"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {t('timeline')}
                </Link>
                <Link
                  href="/explainers/levels-of-power"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {th('explainerLevels')}
                </Link>
                <Link
                  href="/explainers/parliament-powers"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {th('explainerParliament')}
                </Link>
                <Link
                  href="/explainers/government-formation"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {th('explainerFormation')}
                </Link>
                <Link
                  href="/explainers/brussels-paradox"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {th('explainerParadox')}
                </Link>
                <hr className="my-1 border-neutral-100" />
                <Link
                  href="/glossary"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {t('glossary')}
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {t('faq')}
                </Link>
              </div>
            )}
          </div>

          <Link href="/data" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('data')}
          </Link>
          <Search />
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-neutral-100 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3">
            <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-neutral-900">
              {t('home')}
            </Link>
            <a href={`/${locale}/#domains`} onClick={() => setMenuOpen(false)} className="text-sm text-neutral-600 hover:text-neutral-900">
              {t('domains')}
            </a>

            {/* Comprendre section */}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">{t('understand')}</p>
            <Link href="/timeline" onClick={() => setMenuOpen(false)} className="pl-2 text-sm text-neutral-600 hover:text-neutral-900">
              {t('timeline')}
            </Link>
            <Link href="/explainers/levels-of-power" onClick={() => setMenuOpen(false)} className="pl-2 text-sm text-neutral-600 hover:text-neutral-900">
              {th('explainerLevels')}
            </Link>
            <Link href="/explainers/parliament-powers" onClick={() => setMenuOpen(false)} className="pl-2 text-sm text-neutral-600 hover:text-neutral-900">
              {th('explainerParliament')}
            </Link>
            <Link href="/explainers/government-formation" onClick={() => setMenuOpen(false)} className="pl-2 text-sm text-neutral-600 hover:text-neutral-900">
              {th('explainerFormation')}
            </Link>
            <Link href="/explainers/brussels-paradox" onClick={() => setMenuOpen(false)} className="pl-2 text-sm text-neutral-600 hover:text-neutral-900">
              {th('explainerParadox')}
            </Link>
            <Link href="/glossary" onClick={() => setMenuOpen(false)} className="pl-2 text-sm text-neutral-600 hover:text-neutral-900">
              {t('glossary')}
            </Link>
            <Link href="/faq" onClick={() => setMenuOpen(false)} className="pl-2 text-sm text-neutral-600 hover:text-neutral-900">
              {t('faq')}
            </Link>

            <Link href="/data" onClick={() => setMenuOpen(false)} className="mt-2 text-sm text-neutral-600 hover:text-neutral-900">
              {t('data')}
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
