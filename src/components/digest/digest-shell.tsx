// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Image from 'next/image';
import { Inter } from 'next/font/google';
import { AccessibilityToolbar } from '@/components/accessibility-toolbar';
import '@/app/globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Document HTML des pages du digest, hors du site localisé.
 *
 * Il était rendu par un layout unique sous `/digest`, avec `<html lang="en">`
 * pour les 78 langues : la langue réelle ne venait que d'un `<div lang>`
 * intérieur. Deux conséquences mesurées le 2026-09-11 : un lecteur d'écran
 * annonçait l'anglais sur une page arabe (WCAG 3.1.1, langue de la page), et
 * Pagefind, qui lit `<html lang>`, rangeait toutes les archives dans l'index
 * anglais (478 pages contre 146 en français).
 *
 * La langue de la page vient donc du segment `[lang]`. L'habillage (lien
 * d'évitement, en-tête, pied) reste en anglais et le déclare. Seules les
 * archives dans une langue du site entrent dans l'index de recherche : les
 * autres n'ont pas de recherche où apparaître, et créeraient un index par
 * langue.
 */
export function DigestShell({
  lang,
  dir = 'ltr',
  indexed,
  children,
}: {
  lang: string;
  dir?: 'ltr' | 'rtl';
  /** Faux : la page est exclue de l'index Pagefind. */
  indexed: boolean;
  children: React.ReactNode;
}) {
  // L'habillage est en anglais, de gauche à droite : il le déclare quand la
  // page ne l'est pas.
  const chromeLang = lang === 'en' ? undefined : 'en';
  const chromeDir = dir === 'rtl' ? 'ltr' : undefined;
  return (
    <html lang={lang} dir={dir} className={inter.variable}>
      {/* Rendu par un layout racine : <head> y est légitime, la règle vise les pages. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta name="theme-color" content="#1e293b" />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src="/u/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            data-host-url="https://governance.brussels/u"
            data-domains="governance.brussels"
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem('bgm-a11y')||'{}');if(p.dark){document.documentElement.classList.add('dark');}else{document.documentElement.classList.add('light-forced');}if(p.highContrast)document.documentElement.classList.add('high-contrast');if(p.dyslexicFont){document.documentElement.classList.add('dyslexic-font');var l=document.createElement('link');l.id='dyslexic-font-link';l.rel='stylesheet';l.href='https://fonts.cdnfonts.com/css/opendyslexic';document.head.appendChild(l);}if(p.fontScale)document.documentElement.style.setProperty('--font-scale',String(p.fontScale));}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="min-h-screen bg-neutral-50 text-neutral-900 antialiased"
        data-pagefind-ignore={indexed ? undefined : 'all'}
      >
        <div className="flex min-h-screen flex-col">
          <a
            lang={chromeLang}
            dir={chromeDir}
            href="#digest-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:text-neutral-50"
          >
            Skip to content
          </a>
          <header lang={chromeLang} dir={chromeDir} className="border-b border-neutral-200 bg-neutral-50">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
              <a
                href="https://governance.brussels"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight text-brand-900"
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="shrink-0"
                />
                BGM Digest
              </a>
              <a
                href="https://governance.brussels"
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                governance.brussels &rarr;
              </a>
            </div>
          </header>

          <main id="digest-content" className="flex-1" data-pagefind-body={indexed ? '' : undefined}>{children}</main>

          <footer lang={chromeLang} dir={chromeDir} className="border-t border-neutral-200 bg-neutral-50">
            <div className="mx-auto max-w-3xl px-4 py-6 text-center">
              <p className="text-xs text-neutral-500">
                Brussels Governance Monitor &mdash; An{' '}
                <a
                  href="https://advicethat.be"
                  className="underline hover:text-neutral-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Advice That SRL
                </a>{' '}
                project
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                &copy; {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </footer>
        </div>
        <div lang={chromeLang} dir={chromeDir}>
          <AccessibilityToolbar locale={lang} />
        </div>
      </body>
    </html>
  );
}
