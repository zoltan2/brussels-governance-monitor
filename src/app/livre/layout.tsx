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
  title: 'La Lasagne — La naissance de Brussels Governance Monitor',
  description:
    'Bruxelles est la region la plus complexe de Belgique. Ce livre raconte comment un citoyen ordinaire a construit BGM — avec l\'IA, seul, depuis Anderlecht.',
  openGraph: {
    title: 'La Lasagne — La naissance de Brussels Governance Monitor',
    description:
      'Comment un citoyen ordinaire a construit un outil de veille democratique pour Bruxelles — avec l\'IA, seul, depuis Anderlecht.',
    url: 'https://governance.brussels/livre',
    siteName: 'Brussels Governance Monitor',
    type: 'website',
  },
};

export default function LivreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#1B3A6B" />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            integrity="sha384-yRsxKUe1uwvKWyAzDiU58FsIbO8orQJUzy1kPcDQAfAuaczzL5MxTlI4K/AABHhq"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="min-h-screen bg-[#F7F8FC] text-neutral-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-neutral-200 bg-[#F7F8FC]">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
              <a
                href="https://governance.brussels"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#1B3A6B]"
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="shrink-0"
                />
                Brussels Governance Monitor
              </a>
              <a
                href="https://governance.brussels"
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                governance.brussels &rarr;
              </a>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-neutral-200 bg-[#F7F8FC]">
            <div className="mx-auto max-w-4xl px-4 py-6 text-center">
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
                project &middot; Anderlecht, Bruxelles
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                &copy; {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
