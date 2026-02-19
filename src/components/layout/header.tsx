'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { Search } from '@/components/search';

export function Header() {
  const t = useTranslations('nav');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileExplore, setMobileExplore] = useState(false);
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
      setTimeout(() => getMenuItems()[0]?.focus(), 0);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-brand-900">
          <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
          Brussels Governance Monitor
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          <Link href="/domains" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('domains')}
          </Link>
          <Link href="/dashboard" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t('dashboard')}
          </Link>

          {/* Explorer dropdown */}
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
              {t('explore')}
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
              <div ref={menuRef} role="menu" onKeyDown={handleMenuKeyDown} className="absolute left-0 top-full z-50 mt-2 w-56 rounded-lg border border-neutral-200 bg-white py-2 shadow-lg">
                <Link
                  role="menuitem"
                  href="/sectors"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('sectors')}
                </Link>
                <Link
                  role="menuitem"
                  href="/dossiers"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('dossiers')}
                </Link>
                <Link
                  role="menuitem"
                  href="/communes"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('communes')}
                </Link>

                <hr className="my-1.5 border-neutral-100" />

                <Link
                  role="menuitem"
                  href="/understand"
                  onClick={() => setDropdownOpen(false)}
                  className="block px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 focus:bg-neutral-50 focus:text-neutral-900 focus:outline-none"
                >
                  {t('understand')}
                </Link>
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
              </div>
            )}
          </div>

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
            <div className="pb-3">
              <Search />
            </div>

            <hr className="border-neutral-100" />

            <Link href="/" onClick={() => setMenuOpen(false)} className="py-3 text-sm font-medium text-neutral-900">
              {t('home')}
            </Link>
            <Link href="/domains" onClick={() => setMenuOpen(false)} className="py-3 text-sm text-neutral-600 hover:text-neutral-900">
              {t('domains')}
            </Link>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="py-3 text-sm text-neutral-600 hover:text-neutral-900">
              {t('dashboard')}
            </Link>

            <hr className="border-neutral-100" />

            {/* Explorer — accordion */}
            <button
              type="button"
              onClick={() => setMobileExplore(!mobileExplore)}
              className="flex w-full items-center justify-between py-3 text-sm text-neutral-600"
              aria-expanded={mobileExplore}
            >
              {t('explore')}
              <svg
                className={`h-4 w-4 text-neutral-400 transition-transform duration-300 ${mobileExplore ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileExplore && (
              <div className="flex flex-col pb-2">
                <Link href="/sectors" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('sectors')}
                </Link>
                <Link href="/dossiers" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('dossiers')}
                </Link>
                <Link href="/communes" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('communes')}
                </Link>
                <hr className="my-1 border-neutral-100" />
                <Link href="/understand" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('understand')}
                </Link>
                <Link href="/timeline" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('timeline')}
                </Link>
                <Link href="/glossary" onClick={() => setMenuOpen(false)} className="py-2.5 pl-4 text-sm text-neutral-600 hover:text-neutral-900">
                  {t('glossary')}
                </Link>
              </div>
            )}

            <hr className="border-neutral-100" />

            <div className="pt-3">
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
