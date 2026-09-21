// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { messagesPourLeClient } from '@/i18n/client-namespaces';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AccessibilityToolbar } from '@/components/accessibility-toolbar';
import { ChatWidget } from '@/components/chat-widget';
import { GamesPanel } from '@/components/games-panel';

import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await getMessages();
  const metadata = messages.metadata as { title: string; description: string };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    title: {
      default: metadata.title,
      // Short suffix: Google cuts titles around 60 characters, and the full name
      // (30 characters with the separator) pushed most dossier titles past 85.
      // The full name still reaches search results through WebSite.name.
      template: '%s | BGM',
    },
    description: metadata.description,
    metadataBase: new URL(siteUrl),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`]),
      ),
    },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      siteName: 'Brussels Governance Monitor',
      locale,
      type: 'website',
      url: `${siteUrl}/${locale}`,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Brussels Governance Monitor',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.title,
      description: metadata.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations('nav');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const metadata = messages.metadata as { title: string; description: string };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        // Les fiches dossier et commune declarent `isPartOf: { '@id': siteUrl#website }`.
        // Sans cet identifiant ici, la reference pointait dans le vide et chaque page
        // faisait naitre un WebSite fantome au lieu de se rattacher au site (audit 21/09).
        '@id': `${siteUrl}/#website`,
        name: metadata.title,
        description: metadata.description,
        // La racine, pas la version localisee : un seul site, quatre langues.
        url: siteUrl,
        inLanguage: locale,
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/${locale}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Brussels Governance Monitor',
        url: siteUrl,
        description: metadata.description,
        foundingDate: '2024-06-09',
        logo: `${siteUrl}/apple-touch-icon.png`,
        sameAs: [
          'https://github.com/zoltan2/brussels-governance-monitor',
        ],
        areaServed: {
          '@type': 'AdministrativeArea',
          name: 'Brussels-Capital Region',
          sameAs: 'https://www.wikidata.org/wiki/Q240',
        },
        knowsLanguage: ['fr', 'nl', 'en', 'de'],
        knowsAbout: [
          'Brussels regional governance',
          'Belgian politics',
          'Brussels-Capital Region',
          'Public policy monitoring',
          'Government accountability',
        ],
        founder: {
          '@type': 'Person',
          name: 'Zoltán Jánosi',
        },
        parentOrganization: {
          '@type': 'Organization',
          name: 'Advice That SRL',
          url: 'https://advicethat.be',
        },
      },
    ],
  };

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Brussels Governance Monitor"
          href="/feed"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BGM" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script
            defer
            src="/u/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            data-host-url="https://governance.brussels/u"
            data-domains="governance.brussels"
            // Sans cet attribut, le traceur envoie l'URL COMPLETE, chaine de requete
            // comprise. Or les liens de desabonnement des emails portent un jeton
            // valable un an (src/lib/token.ts) qui donne lecture de l'adresse et des
            // themes d'un abonne : chaque clic l'inscrivait dans la base Umami.
            // Verifie dans le traceur servi : `N = T("exclude-search") === "true"`
            // puis `N && (e.search = "")`. La suppression n'a lieu que si l'attribut
            // vaut exactement "true" (audit 21/09).
            data-exclude-search="true"
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem('bgm-a11y')||'{}');if(p.dark){document.documentElement.classList.add('dark');}else if(localStorage.getItem('bgm-a11y')){document.documentElement.classList.add('light-forced');}if(p.highContrast)document.documentElement.classList.add('high-contrast');if(p.dyslexicFont)document.documentElement.classList.add('dyslexic-font');if(p.fontScale)document.documentElement.style.setProperty('--font-scale',String(p.fontScale));}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        {/*
          Seuls les espaces de noms dont un composant CLIENT a besoin traversent
          le reseau. Le dictionnaire entier (182 Ko) etait serialise dans chaque
          page, ou il representait de 61 a 88 % de la charge — pour un contenu
          presque jamais utilise cote client. Les composants serveur, eux,
          continuent de lire `messages` en entier : rien ne change a l'ecran.
          La liste est verrouillee par src/i18n/client-namespaces.test.ts.
        */}
        <NextIntlClientProvider messages={messagesPourLeClient(messages)}>
          <div className="flex min-h-screen flex-col">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:text-neutral-50"
            >
              {t('skipToContent')}
            </a>
            <Header />
            <main id="main-content" className="flex-1" data-pagefind-body="">{children}</main>
            <Footer />
          </div>
          <AccessibilityToolbar />
          <ChatWidget />
          <GamesPanel locale={locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
