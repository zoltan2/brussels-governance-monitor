// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { buildMetadata } from '@/lib/metadata';
import { Breadcrumb } from '@/components/breadcrumb';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    locale,
    title: 'Le Signal — Newsletter hebdomadaire',
    description:
      'Chaque lundi, Le Signal résume l\'essentiel de la gouvernance bruxelloise : décisions, budgets, dossiers, signaux faibles. Gratuit, sur LinkedIn.',
    path: '/signal',
  });
}

const LINKEDIN_SUBSCRIBE_URL =
  'https://www.linkedin.com/newsletters/le-signal-bgm-7430513857359527936/';

export default async function SignalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <section className="py-12">
      <div className="mx-auto max-w-2xl px-4">
        <Breadcrumb
          items={[
            { label: 'Accueil', href: `/${locale}` },
            { label: 'Le Signal' },
          ]}
        />

        {/* Hero */}
        <div className="mb-10">
          <div className="mb-3 text-xs uppercase tracking-widest text-neutral-400">
            Newsletter hebdomadaire
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            Le Signal
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-neutral-600">
            Chaque lundi, un résumé clair et sourcé de ce qui s&apos;est passé dans la
            gouvernance bruxelloise. Pas de bruit, pas d&apos;opinion — les faits, les
            chiffres, les décisions qui comptent.
          </p>
        </div>

        {/* CTA principal */}
        <div className="mb-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
          <div className="text-center">
            <p className="mb-1 text-sm font-medium text-neutral-900">
              Gratuit. Chaque lundi. Sur LinkedIn.
            </p>
            <p className="mb-5 text-xs text-neutral-500">
              Rejoignez les professionnels qui suivent Bruxelles de près.
            </p>
            <a
              href={LINKEDIN_SUBSCRIBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-brand-800"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              S&apos;abonner sur LinkedIn
            </a>
          </div>
        </div>

        {/* Ce que contient Le Signal */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            Ce que vous recevez chaque lundi
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-2 text-sm font-medium text-neutral-900">
                Les faits de la semaine
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                Décisions du gouvernement, votes au Parlement, arrêtés publiés au Moniteur
                — résumés en langage clair.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-2 text-sm font-medium text-neutral-900">
                Les signaux à surveiller
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                Tendances émergentes, dossiers qui bougent, alertes sur les 13 domaines
                suivis par BGM.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-2 text-sm font-medium text-neutral-900">
                Un chiffre clé
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                Budget, emploi, logement, mobilité — un indicateur mis en contexte pour
                comprendre l&apos;évolution de Bruxelles.
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-2 text-sm font-medium text-neutral-900">
                Sources vérifiées
              </div>
              <p className="text-xs leading-relaxed text-neutral-500">
                Chaque fait est tracé jusqu&apos;à sa source officielle. 323 sources
                surveillées en 4 langues.
              </p>
            </div>
          </div>
        </div>

        {/* Pour qui */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            Pour qui ?
          </h2>
          <ul className="space-y-3 text-sm text-neutral-600">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Professionnels du secteur public</strong> —
                cabinets, administrations, parastataux
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Société civile</strong> —
                associations, ONG, syndicats, fédérations
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Journalistes et chercheurs</strong> —
                qui couvrent ou étudient Bruxelles
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Citoyens engagés</strong> —
                qui veulent comprendre comment leur ville est gouvernée
              </span>
            </li>
          </ul>
        </div>

        {/* CTA secondaire */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
          <p className="mb-4 text-sm text-neutral-600">
            2 minutes de lecture. Zéro spam. Désabonnement en un clic.
          </p>
          <a
            href={LINKEDIN_SUBSCRIBE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-800 px-6 py-3 text-sm font-medium text-brand-800 transition hover:bg-neutral-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Recevoir Le Signal chaque lundi
          </a>
          <p className="mt-4 text-xs text-neutral-400">
            Aussi disponible : la{' '}
            <a href={`/${locale}/subscribe`} className="underline hover:text-neutral-600">
              newsletter email
            </a>{' '}
            pour un suivi personnalisé par domaine et par dossier.
          </p>
        </div>
      </div>
    </section>
  );
}
