// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Page d'une vérification.
 *
 * La collection `verifications` existait depuis février 2026, avec un
 * `permalink` calculé au schéma Velite (`/verifications/{cardSlug}-{date}`), et
 * AUCUNE route ne la servait : les douze fiches répondaient 404. Elles n'étaient
 * visibles que comme encart sur la fiche domaine correspondante.
 *
 * POURQUOI PAS `ClaimReview`, QUE L'AUDIT PROPOSAIT.
 *
 * `ClaimReview` décrit la vérification d'une affirmation faite AILLEURS, par un
 * tiers, et Google l'attend sous cette forme. Ici, les quatre résultats
 * possibles sont `no-change`, `change-detected`, `uncertainty` et `suspended` :
 * ils disent si NOTRE carte devait bouger après relecture de ses sources. C'est
 * un registre de maintenance éditoriale, pas un examen de la parole d'autrui.
 * Émettre `ClaimReview` là-dessus serait un détournement du type, exposé à une
 * action manuelle pour balisage trompeur, et surtout ce serait faux.
 *
 * On émet donc un `Article` relié à la fiche contrôlée par `about`. Le jour où
 * une collection examinera réellement des affirmations de tiers, `ClaimReview`
 * y aura sa place.
 */

import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import {
  getVerification,
  getVerificationSlugs,
  getVerificationLocales,
  getDomainCard,
  getSectorCard,
  type Verification,
} from '@/lib/content';
import { routing, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { formatDate } from '@/lib/utils';
import { buildMetadata, canonicalUrl } from '@/lib/metadata';
import { MdxContent } from '@/components/mdx-content';
import { Breadcrumb } from '@/components/breadcrumb';
import { ArrowLeft } from 'lucide-react';

export const dynamicParams = false;

/**
 * Seules les paires locale + slug qui EXISTENT vraiment.
 *
 * Deux fiches sur quatre ne sont traduites qu'en français et en néerlandais. On
 * ne génère donc pas de page anglaise ou allemande pour elles : mieux vaut un
 * 404 franc que du français servi sous un drapeau anglais sur un registre de
 * vérification, où la langue du texte engage la lecture des sources.
 */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getVerificationSlugs(locale).map((slug) => ({ locale, slug })),
  );
}

/** Titre de la fiche contrôlée, dans la langue de la page. */
function titreDeLaFiche(verification: Verification, locale: Locale): string {
  const carte =
    verification.cardType === 'domain'
      ? getDomainCard(verification.cardSlug, locale)
      : getSectorCard(verification.cardSlug, locale);
  return carte?.card.title ?? verification.cardSlug;
}

/** Chemin de la fiche contrôlée, pour le lien de retour. */
function cheminDeLaFiche(verification: Verification): string {
  return verification.cardType === 'domain'
    ? `/domains/${verification.cardSlug}`
    : `/sectors/${verification.cardSlug}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const verification = getVerification(slug, locale as Locale);
  if (!verification) return {};

  const t = await getTranslations({ locale, namespace: 'verification' });
  const card = titreDeLaFiche(verification, locale as Locale);
  const date = formatDate(verification.date, locale);

  return buildMetadata({
    locale,
    title: t('pageTitle', { date }),
    description: t('metaDescription', { card, date }),
    path: `/verifications/${slug}`,
    // La collection est partiellement traduite : sans cette restriction, la
    // page déclarerait un hreflang vers une langue où elle n'existe pas, donc
    // vers une 404. Voir src/lib/metadata.ts.
    availableLocales: getVerificationLocales(slug),
    ogParams: `title=${encodeURIComponent(card)}&type=verification`,
  });
}

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const verification = getVerification(slug, locale as Locale);
  if (!verification) notFound();

  const card = titreDeLaFiche(verification, locale as Locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${card} — ${verification.date}`,
    description: verification.summary,
    datePublished: verification.date,
    dateModified: verification.lastModified,
    url: canonicalUrl(locale, `/verifications/${slug}`),
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', '@id': `${siteUrl}/#website` },
    author: { '@id': `${siteUrl}/#organization` },
    publisher: { '@id': `${siteUrl}/#organization` },
    // La fiche contrôlée, pour que le graphe relie le registre à son objet.
    about: {
      '@type': 'WebPage',
      name: card,
      url: canonicalUrl(locale, cheminDeLaFiche(verification)),
    },
    // Les sources réellement consultées lors du contrôle : c'est ce qui rend la
    // vérification opposable, et c'est ce qu'un moteur génératif cite.
    citation: verification.sourcesConsulted.map((s) => ({
      '@type': 'CreativeWork',
      name: s.label,
      url: s.url,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <VerificationDetail verification={verification} card={card} locale={locale} />
    </>
  );
}

function VerificationDetail({
  verification,
  card,
  locale,
}: {
  verification: Verification;
  card: string;
  locale: string;
}) {
  const t = useTranslations('verification');
  const tb = useTranslations('breadcrumb');
  const date = formatDate(verification.date, locale);

  return (
    <article className="py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Breadcrumb
          items={[{ label: tb('home'), href: '/' }, { label: tb('verifications') }]}
        />

        <h1 className="mb-2 text-2xl font-bold text-neutral-900">{t('pageTitle', { date })}</h1>
        <p className="mb-6 text-sm text-neutral-600">{t('aboutCard', { card })}</p>

        <p className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-relaxed text-neutral-700">
          {t('result.' + verification.result)}
          {verification.nextVerification && (
            <span className="mt-1 block text-xs text-neutral-500">
              {t('nextDate', { date: formatDate(verification.nextVerification, locale) })}
            </span>
          )}
        </p>

        <div className="prose prose-neutral max-w-none">
          <MdxContent code={verification.content} />
        </div>

        {verification.sourcesConsulted.length > 0 && (
          <section className="mt-10 border-t border-neutral-200 pt-6">
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">{t('sourcesConsulted')}</h2>
            <ul className="space-y-2">
              {verification.sourcesConsulted.map((source, i) => (
                <li key={i} className="text-sm leading-relaxed text-neutral-700">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:text-brand-900 hover:underline"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 text-xs text-neutral-500">{t('editor', { editor: verification.editor })}</p>
        <p className="mt-2 text-xs leading-relaxed text-neutral-500">{t('whatIsThis')}</p>

        <Link
          href={cheminDeLaFiche(verification) as never}
          className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('backToCard')}
        </Link>
      </div>
    </article>
  );
}
