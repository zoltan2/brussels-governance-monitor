// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Merci — Café Numérique · Brussels Governance Monitor',
  description:
    'Ressources, dossiers et contact après la présentation BGM au Café Numérique de Bruxelles du 13 avril 2026.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MerciCafeNumeriqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} light-forced`}>
      <head>
        <meta name="theme-color" content="#1B3A6B" />
        <meta name="color-scheme" content="light" />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body
        data-pagefind-ignore="all"
        className="min-h-screen bg-[#F7F8FC] text-neutral-900 antialiased"
      >
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-neutral-200 bg-[#F7F8FC]">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
              <a
                href="https://governance.brussels"
                className="flex items-center gap-2 text-base font-semibold tracking-tight text-[#1B3A6B] sm:text-lg"
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="shrink-0"
                />
                <span className="hidden sm:inline">
                  Brussels Governance Monitor
                </span>
                <span className="sm:hidden">BGM</span>
              </a>
              <a
                href="https://governance.brussels"
                className="text-xs text-neutral-500 hover:text-neutral-700 sm:text-sm"
              >
                governance.brussels &rarr;
              </a>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-neutral-200 bg-[#F7F8FC]">
            <div className="mx-auto max-w-4xl px-4 py-6 text-center">
              <p className="text-xs leading-relaxed text-neutral-500">
                governance.brussels &middot; Advice That SRL &middot; BCE
                0728.534.930 &middot; Ind&eacute;pendant &middot; Sans
                publicit&eacute; &middot; Sans subvention
              </p>
              <p className="mt-2 text-xs text-neutral-500">
                &copy; {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
