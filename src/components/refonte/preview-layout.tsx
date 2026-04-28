// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';

// Élections régionales bruxelloises : 9 juin 2024 → législature 2024-2029.
// Prochaines élections (= fin de législature) : 6 juin 2029 (premier dimanche
// de juin, jour des européennes). Source à reconfirmer si on cible une date
// strictement officielle plutôt que le jour des élections.
const LEGISLATURE_END = new Date('2029-06-06T00:00:00Z');

function getDaysRemaining(): number {
  const today = new Date();
  const ms = LEGISLATURE_END.getTime() - today.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Garde le gradient slate-* sur la section : l'override globals.css
// `.dark section[class*="from-slate"]` le swap vers neutral-200 en dark mode,
// donc la countdown reste lisible dans les deux thèmes.
function LegislatureCountdown() {
  const days = getDaysRemaining();
  return (
    <section className="bg-gradient-to-b from-slate-800 to-slate-700 py-16 text-white">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/60">
          Législature 2024 — 2029 · Élections régionales le 6 juin 2029
        </p>
        <p className="mt-4 font-mono text-7xl font-bold tabular-nums tracking-tight md:text-8xl">
          {days}
        </p>
        <p className="mt-2 text-lg uppercase tracking-[0.22em] text-white/85 md:text-xl">
          jours avant la fin de la législature
        </p>
      </div>
    </section>
  );
}

/**
 * Wrapper for /refonte/preview/* pages.
 *
 * Each preview swaps only the hero. Everything around it (nav, sticky
 * « aperçu » ribbon, contextual sections under the hero, footer back to
 * the vote) stays identical so voters compare like-with-like.
 */
export function PreviewLayout({
  optionLabel,
  children,
}: {
  optionLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-neutral-50 text-neutral-900">
      {/* Sticky « aperçu » ribbon */}
      <div className="sticky top-0 z-30 border-b border-neutral-200 bg-amber-50 px-4 py-2.5 text-center text-xs">
        <span className="font-mono uppercase tracking-[0.18em] text-amber-900">
          Aperçu · Hero {optionLabel}
        </span>
        <span className="mx-3 text-amber-700/60">·</span>
        <Link
          href="/refonte"
          className="font-mono uppercase tracking-[0.18em] text-amber-900 underline-offset-4 hover:underline"
        >
          ← Retour au vote
        </Link>
      </div>

      {/* Nav placeholder (simulates BGM nav without rendering it real) */}
      <nav className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="font-mono text-sm font-semibold tracking-tight text-neutral-900">
            Brussels Governance Monitor
          </span>
          <span className="hidden gap-6 font-mono text-xs uppercase tracking-[0.18em] text-neutral-500 md:flex">
            <span>Domaines</span>
            <span>Dossiers</span>
            <span>Communes</span>
            <span>Comprendre</span>
          </span>
        </div>
      </nav>

      {/* HERO SLOT */}
      {children}

      <LegislatureCountdown />

      {/* Domaines (conservé du design actuel) */}
      <section className="border-b border-neutral-200 bg-neutral-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <header className="mb-8 flex items-baseline justify-between">
            <h2 className="text-2xl tracking-tight text-neutral-900 md:text-3xl">
              Treize domaines, suivis en continu
            </h2>
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-400">
              Échantillon
            </span>
          </header>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { d: 'Mobilité', m: 'Good Move suspendu, contentieux en cours', s: 'amber' },
              { d: 'Logement', m: 'SLRB : 39 000 demandes, 0 livraisons 2026', s: 'amber' },
              { d: 'Sécurité', m: 'Fusion zones de police annoncée pour 2027', s: 'blue' },
            ].map((c) => (
              <article
                key={c.d}
                className="rounded-lg border border-neutral-200 bg-neutral-100 p-6 transition hover:border-neutral-400"
              >
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    c.s === 'amber' ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                />
                <h3 className="mt-3 text-lg tracking-tight text-neutral-900">{c.d}</h3>
                <p className="mt-2 text-sm text-neutral-600">{c.m}</p>
                <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                  Voir le domaine →
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pied — retour au vote */}
      <footer className="border-t border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-neutral-500">
          Fin de l&apos;aperçu
        </p>
        <p className="mt-3 max-w-xl mx-auto text-sm text-neutral-700">
          Cet aperçu simule la home BGM avec un hero en {optionLabel.toLowerCase()}. Le reste de la page (compteur de crise, sections domaines, etc.) ne change pas selon l&apos;option du hero.
        </p>
        <Link
          href="/refonte"
          className="mt-6 inline-flex items-center gap-2 rounded border border-neutral-900 bg-neutral-50 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-neutral-900 transition hover:bg-neutral-900 hover:text-neutral-50"
        >
          ← Retour au vote
        </Link>
      </footer>
    </div>
  );
}
