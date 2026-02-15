import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Weekly Digest | Brussels Governance Monitor',
    template: '%s | BGM Digest',
  },
  description:
    'Weekly summary of Brussels governance — available in 78 languages.',
};

export default function DigestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#1e293b" />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
      </head>
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-neutral-200 bg-white">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
              <a
                href="https://governance.brussels"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight text-brand-900"
              >
                <img
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

          <main className="flex-1">{children}</main>

          <footer className="border-t border-neutral-200 bg-neutral-50">
            <div className="mx-auto max-w-3xl px-4 py-6 text-center">
              <p className="text-xs text-neutral-500">
                Brussels Governance Monitor &mdash; An{' '}
                <a
                  href="https://advicethat.com"
                  className="underline hover:text-neutral-700"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Advice That SRL
                </a>{' '}
                project
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                &copy; {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
