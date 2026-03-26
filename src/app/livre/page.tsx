// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Image from 'next/image';
import { PreorderForm } from './preorder-form';

const reasons = [
  {
    title: 'Pourquoi j\u2019ai construit BGM',
    description:
      'Un citoyen d\u2019Anderlecht, aucune formation en journalisme, aucune connexion politique \u2014 juste la conviction qu\u2019un outil manquait.',
  },
  {
    title: 'Comment l\u2019IA m\u2019a permis de faire ce qui \u00e9tait impossible seul',
    description:
      '547 pages, 4 langues, 323 sources, une veille quotidienne \u2014 le r\u00e9cit technique et humain d\u2019une collaboration avec l\u2019intelligence artificielle.',
  },
  {
    title: 'Ce que la complexit\u00e9 bruxelloise dit de notre d\u00e9mocratie',
    description:
      'F\u00e9d\u00e9ral, r\u00e9gional, communal, communautaire \u2014 pourquoi personne ne comprend qui d\u00e9cide quoi, et pourquoi c\u2019est un probl\u00e8me.',
  },
  {
    title: 'Les limites \u2014 techniques, \u00e9thiques, humaines',
    description:
      'Ce que l\u2019IA ne sait pas faire. Ce qu\u2019un citoyen seul ne peut pas couvrir. Les choix \u00e9ditoriaux qui m\u2019ont emp\u00each\u00e9 de dormir.',
  },
];

export default function LivrePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Hero — two columns on desktop, single on mobile */}
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
        {/* Cover image */}
        <div className="w-full max-w-[300px] shrink-0 md:max-w-[400px]">
          <div className="overflow-hidden rounded-lg shadow-lg">
            {/* TODO: replace placeholder with actual cover when provided */}
            <Image
              src="/livre/cover.png"
              alt="Couverture du livre La Lasagne \u2014 Zolt\u00e1n J\u00e1nosi"
              width={400}
              height={580}
              className="h-auto w-full"
              priority
            />
          </div>
        </div>

        {/* Text content */}
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-[#1B3A6B] md:text-5xl">
            La Lasagne
          </h1>
          <p className="mt-2 text-lg font-medium text-[#1B3A6B]/70 italic">
            Ce qu&rsquo;une crise politique m&rsquo;a appris sur la
            d&eacute;mocratie, les citoyens et l&rsquo;intelligence
            artificielle.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Zolt&aacute;n J&aacute;nosi
          </p>

          <blockquote className="mt-6 border-l-4 border-[#F2A900] pl-4 text-base leading-relaxed text-neutral-700">
            Bruxelles est la r&eacute;gion la plus complexe de Belgique. Et
            pourtant, aucun outil citoyen n&rsquo;existait pour suivre ce qui
            s&rsquo;y d&eacute;cide. Ce livre raconte comment un citoyen
            ordinaire a construit BGM &mdash; avec l&rsquo;IA, seul, depuis
            Anderlecht &mdash; et ce que cette aventure dit de notre
            d&eacute;mocratie.
          </blockquote>
        </div>
      </div>

      {/* Reasons to read */}
      <section className="mt-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-[#1B3A6B]">
          Dans ce livre
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-[#1B3A6B]">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Preorder form */}
      <section className="mt-16">
        <div className="mx-auto max-w-md rounded-xl border border-[#1B3A6B]/10 bg-white p-8 shadow-md">
          <h2 className="mb-2 text-center text-xl font-bold text-[#1B3A6B]">
            Pr&eacute;commande
          </h2>
          <p className="mb-6 text-center text-sm text-neutral-500">
            Sois parmi les premiers inform&eacute;s de la date de parution et
            du prix d&eacute;finitif.
          </p>
          <PreorderForm />
        </div>
      </section>
    </div>
  );
}
