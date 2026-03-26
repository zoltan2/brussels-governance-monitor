// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Image from 'next/image';
import { PreorderForm } from './preorder-form';

const reasons = [
  {
    title: 'Pourquoi j\u2019ai construit BGM',
    description:
      'Pas par militantisme. Par frustration. Un matin, j\u2019ai cherché à comprendre qui avait décidé quelque chose dans ma ville — et je n\u2019ai pas trouvé. Ce livre commence exactement là.',
  },
  {
    title: 'Comment l\u2019IA m\u2019a permis de faire ce qui était impossible seul',
    description:
      'Surveiller des dizaines de sources institutionnelles, en quatre langues, chaque jour, seul — c\u2019est mathématiquement impossible sans automatisation. Ce livre raconte comment s\u2019est construit ce pipeline, semaine après semaine, essai après erreur.',
  },
  {
    title: 'Ce que la complexité bruxelloise dit de notre démocratie',
    description:
      'Bruxelles n\u2019est pas opaque parce que quelqu\u2019un a décidé de cacher quoi que ce soit. Elle est opaque parce que personne n\u2019a eu intérêt à rendre ça simple. C\u2019est une distinction importante — et elle change tout.',
  },
  {
    title: 'Les limites',
    description:
      'Ce qu\u2019un citoyen seul ne peut structurellement pas faire. Les biais que l\u2019automatisation introduit sans qu\u2019on le veuille. Et les choix que j\u2019ai dû assumer — sur ce que BGM publie, et sur ce qu\u2019il ne publiera jamais.',
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
            <Image
              src="/livre/cover.png"
              alt="Couverture du livre La Lasagne — Zoltán Jánosi"
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
          <p className="mt-2 text-lg font-medium text-[#1B3A6B] italic">
            Ce qu&rsquo;une crise politique m&rsquo;a appris sur la
            d&eacute;mocratie, les citoyens et l&rsquo;intelligence
            artificielle.
          </p>
          <p className="mt-1 text-sm text-[#4A5568]">
            Zolt&aacute;n J&aacute;nosi
          </p>

          <blockquote className="mt-6 border-l-4 border-[#F2A900] pl-4 text-base leading-relaxed text-[#1A2744]">
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
              className="rounded-lg border border-[#E0E6F0] bg-white p-6 shadow-sm"
            >
              <h3 className="text-base font-semibold text-[#1B3A6B]">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4A5568]">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Preorder form */}
      <section className="mt-16">
        <div className="mx-auto max-w-md rounded-xl bg-[#1B3A6B] p-8 shadow-md">
          <h2 className="mb-2 text-center text-xl font-bold text-white">
            Pr&eacute;commande
          </h2>
          <p className="mb-6 text-center text-sm text-white/70">
            Sois parmi les premiers inform&eacute;s de la date de parution et
            du prix d&eacute;finitif.
          </p>
          <PreorderForm />
        </div>
      </section>
    </div>
  );
}
