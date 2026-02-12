'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { Search } from '@/components/search';

export function Header() {
  const t = useTranslations('nav');
  const th = useTranslations('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileComprendre, setMobileComprendre] = useState(false);
  const [mobileTools, setMobileTools] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function getMenuItems() {
    return menuRef.current
      ? Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      : [];
  }

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const items = getMenuItems();
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = current < items.length - 1 ? current + 1 : 0;
        items[next].focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = current > 0 ? current - 1 : items.length - 1;
        items[prev].focus();
        break;
      }
      case 'Home':
        e.preventDefault();
        items[0].focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1].focus();
        break;
      case 'Escape':
        e.preventDefault();
        setDropdownOpen(false);
        triggerRef.current?.focus();
        break;
    }
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDropdownOpen(true);
      // Focus first item on next tick after render
      setTimeout(() => getMenuItems()[0]?.focus(), 0);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-brand-900">
          <img src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
          Brussels Governance Monitor
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          <Link href="/domains" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('domains')}
          </Link>

          {/* Comprendre dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onKeyDown={handleTriggerKeyDown}
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
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div ref={menuRef} role="menu" onKeyDown={handleMenuKeyDown} className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-neutral-200 bg-white py-2 shadow-lg">
                {/* Fondamentaux */}
                <p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {t('understandFundamentals')}
                </p>
                <Link
                  role="menuitem"
                  href="/explainers/brussels-overview"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {th('explainerOverview')}
                </Link>
                <Link
                  role="menuitem"
                  href="/explainers/levels-of-power"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {th('explainerLevels')}
                </Link>
                <Link
                  role="menuitem"
                  href="/explainers/government-formation"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {th('explainerFormation')}
                </Link>

                {/* Éclairages */}
                <p className="mt-2 px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {t('understandInsights')}
                </p>
                <Link
                  role="menuitem"
                  href="/explainers/brussels-paradox"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {th('explainerParadox')}
                </Link>
                <Link
                  role="menuitem"
                  href="/explainers/parliament-powers"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {th('explainerParliament')}
                </Link>
                <Link
                  role="menuitem"
                  href="/explainers/brussels-cosmopolitan"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {th('explainerCosmopolitan')}
                </Link>

                <hr className="my-1.5 border-neutral-100" />
                <Link
                  role="menuitem"
                  href="/timeline"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('timeline')}
                </Link>
                <Link
                  role="menuitem"
                  href="/glossary"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('glossary')}
                </Link>
                <Link
                  role="menuitem"
                  href="/faq"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('faq')}
                </Link>
                <Link
                  role="menuitem"
                  href="/data"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('data')}
                </Link>
              </div>
            )}
          </div>

          <Link href="/sectors" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('sectors')}
          </Link>
          <Link href="/dossiers" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('dossiers')}
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
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-neutral-100 px-4 pb-4 md:hidden">
          <nav aria-label="Menu" className="flex flex-col pt-3">
            {/* Search — always visible at top */}
            <div className="pb-3">
              <Search />
            </div>

            <hr className="border-neutral-100" />

            {/* Direct links */}
            <Link href="/" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-neutral-900">
              {t('home')}
            </Link>
            <Link href="/domains" onClick={() => setMenuOpen(false)} className="py-3 text-sm text-neutral-600 hover:text-neutral-900">
              {t('domains')}
            </Link>
            <Link href="/sectors" onClick={() => setMenuOpen(false)} className="py-3 text-sm text-neutral-600 hover:text-neutral-900">
              {t('sectors')}
            </Link>
            <Link href="/dossiers" onClick={() => setMenuOpen(false)} className="py-3 text-sm text-neutral-600 hover:text-neutral-900">
              {t('dossiers')}
            </Link>

            <hr className="border-neutral-100" />

            {/* Comprendre — accordion */}
            <button
              type="button"
              onClick={() => setMobileComprendre(!mobileComprendre)}
              className="flex w-full items-center justify-between py-3 text-sm text-neutral-600"
              aria-expanded={mobileComprendre}
            >
              {t('understand')}
              <svg
                className={`h-4 w-4 text-neutral-400 transition-transform duration-300 ${mobileComprendre ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileComprendre && (
              <div className="flex flex-col pb-2">
                <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  {t('understandFundamentals')}
                </p>
                <Link href="/explainers/brussels-overview" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {th('explainerOverview')}
                </Link>
                <Link href="/explainers/levels-of-power" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {th('explainerLevels')}
                </Link>
                <Link href="/explainers/government-formation" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {th('explainerFormation')}
                </Link>
                <p className="mt-2 px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  {t('understandInsights')}
                </p>
                <Link href="/explainers/brussels-paradox" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {th('explainerParadox')}
                </Link>
                <Link href="/explainers/parliament-powers" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {th('explainerParliament')}
                </Link>
                <Link href="/explainers/brussels-cosmopolitan" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {th('explainerCosmopolitan')}
                </Link>
              </div>
            )}

            {/* Outils — accordion */}
            <button
              type="button"
              onClick={() => setMobileTools(!mobileTools)}
              className="flex w-full items-center justify-between py-3 text-sm text-neutral-600"
              aria-expanded={mobileTools}
            >
              {t('tools')}
              <svg
                className={`h-4 w-4 text-neutral-400 transition-transform duration-300 ${mobileTools ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileTools && (
              <div className="flex flex-col pb-2">
                <Link href="/timeline" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('timeline')}
                </Link>
                <Link href="/glossary" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('glossary')}
                </Link>
                <Link href="/faq" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('faq')}
                </Link>
                <Link href="/data" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('data')}
                </Link>
              </div>
            )}

            <hr className="border-neutral-100" />

            {/* Language switcher */}
            <div className="pt-3">
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
