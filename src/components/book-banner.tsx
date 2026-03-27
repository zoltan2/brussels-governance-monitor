// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function BookBanner() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="overflow-hidden rounded-xl bg-neutral-900 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
            {/* Cover */}
            <div className="w-[140px] shrink-0 sm:w-[160px]">
              <Image
                src="/livre/cover-homepage.webp"
                alt="La Lasagne — Zoltán Jánosi"
                width={160}
                height={240}
                className="h-auto w-full rounded-md shadow-lg"
              />
            </div>

            {/* Text */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-400">
                Par l&rsquo;auteur de ce moniteur
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                La Lasagne
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-400 italic">
                Ce qu&rsquo;une crise politique m&rsquo;a appris sur la
                d&eacute;mocratie, les citoyens et l&rsquo;intelligence
                artificielle.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                613 jours sans gouvernement. Aucun outil citoyen pour suivre.
                Ce livre raconte comment un individu seul a combl&eacute; ce
                vide avec l&rsquo;IA &mdash; et ce que &ccedil;a
                r&eacute;v&egrave;le sur nos d&eacute;mocraties.
              </p>
              <a
                href="/livre"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-amber-400 px-5 py-2.5 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-400 hover:text-neutral-900"
              >
                Pr&eacute;commander
                <ArrowRight size={14} aria-hidden={true} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
