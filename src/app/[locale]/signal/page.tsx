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
    title: 'Le Signal — Newsletter hebdomadaire sur LinkedIn',
    description:
      'Chaque lundi, Le Signal résume la gouvernance bruxelloise en 2 minutes. Gratuit, sur LinkedIn.',
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
            Chaque lundi sur LinkedIn
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
            Le Signal
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-neutral-600">
            Bruxelles a 19 communes, 6 gouvernements et des centaines de décisions
            chaque semaine. Personne n&apos;a le temps de tout suivre.
            <br />
            <strong className="text-neutral-900">C&apos;est exactement pour ça que Le Signal existe.</strong>
          </p>
        </div>

        {/* CTA principal */}
        <div className="mb-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
          <div className="text-center">
            <p className="mb-4 text-sm text-neutral-600">
              2 minutes de lecture. Chaque lundi matin. Gratuit.
            </p>
            <a
              href={LINKEDIN_SUBSCRIBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-900 px-6 py-3 text-sm font-medium text-neutral-50 transition hover:bg-brand-800"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              S&apos;abonner sur LinkedIn
            </a>
          </div>
        </div>

        {/* Ce que c'est */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            Le Signal, c&apos;est quoi ?
          </h2>
          <p className="text-sm leading-relaxed text-neutral-600">
            Une newsletter publiée chaque lundi sur LinkedIn par le
            Brussels Governance Monitor. Pas d&apos;opinion, pas de jargon
            — un résumé factuel de ce qui s&apos;est passé dans la semaine à
            Bruxelles, avec les sources pour aller plus loin.
          </p>
        </div>

        {/* Format */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            Ce que vous y trouvez
          </h2>
          <ul className="space-y-3 text-sm text-neutral-600">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Le fait marquant</strong> —
                la décision ou l&apos;événement qui a le plus d&apos;impact sur Bruxelles cette semaine
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Les signaux faibles</strong> —
                ce qui bouge en coulisse et pourrait devenir important
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Le chiffre</strong> —
                une donnée mise en contexte pour comprendre la tendance
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-800" />
              <span>
                <strong className="font-medium text-neutral-900">Les liens</strong> —
                vers les fiches BGM mises à jour, pour approfondir à votre rythme
              </span>
            </li>
          </ul>
        </div>

        {/* Pour qui */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            Pour qui ?
          </h2>
          <p className="mb-3 text-sm leading-relaxed text-neutral-600">
            Pour tous ceux qui ont besoin de comprendre Bruxelles sans y consacrer
            des heures :
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              'Cabinets et administrations',
              'Associations et ONG',
              'Journalistes et chercheurs',
              'Entreprises actives à Bruxelles',
              'Fédérations professionnelles',
              'Citoyens engagés',
            ].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* CTA secondaire */}
        <div className="mb-10 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
          <p className="mb-1 text-sm font-medium text-neutral-900">
            Rejoignez les professionnels qui suivent Bruxelles de près
          </p>
          <p className="mb-4 text-xs text-neutral-500">
            Zéro spam. Désabonnement en un clic.
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
        </div>

        {/* Séparation + digest email */}
        <div className="border-t border-neutral-100 pt-8 text-center">
          <p className="mb-1 text-xs uppercase tracking-widest text-neutral-400">
            Vous préférez l&apos;email ?
          </p>
          <p className="mb-3 text-sm text-neutral-600">
            Notre digest email vous permet de choisir vos domaines, dossiers et communes
            — vous ne recevez que ce qui vous concerne.
          </p>
          <a
            href={`/${locale}/subscribe`}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-800 hover:underline"
          >
            Configurer le digest email →
          </a>
        </div>
      </div>
    </section>
  );
}
