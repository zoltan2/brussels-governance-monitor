// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Hero neutre, identique pour les 3 previews de l'axe Surface écosystème.
 *
 * Les 3 options testent ce qu'il y a SOUS le hero, donc le hero ne doit pas
 * varier. Si le hero variait, le votant comparerait les heros, pas les surfaces.
 */
export function NeutralHero() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Brussels Governance Monitor
        </p>
        <h1 className="mt-4 max-w-3xl text-3xl tracking-tight text-slate-900 md:text-5xl md:leading-tight">
          Treize domaines, vingt-et-un dossiers, dix-neuf communes — suivis en continu.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-700 md:text-lg">
          Des données institutionnelles bruxelloises, lisibles, sourcées, mises à jour chaque semaine. Indépendant. Source-available.
        </p>
        <a
          href="#"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
        >
          Voir la veille de la semaine
          <span aria-hidden>→</span>
        </a>
      </div>
    </section>
  );
}
