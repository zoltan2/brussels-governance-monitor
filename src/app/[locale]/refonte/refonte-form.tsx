// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

type Axis1 = 'thermometre' | 'mosaique' | 'texte_fort' | 'multilingue';
type Axis2 = 'sobre_actuel' | 'sobre_vivant' | 'journalistique' | 'voix_editeur';
type Axis3 = 'mosaique_multi' | 'disperse' | 'hub_externe';
type Axis4 = 'quotidien' | 'hebdo' | 'evenement' | 'mixte';

interface VoteState {
  axis1: Axis1 | null;
  axis2: Axis2 | null;
  axis3: Axis3 | null;
  axis4: Axis4 | null;
  comment: string;
  email: string;
  emailOptIn: boolean;
}

const initial: VoteState = {
  axis1: null,
  axis2: null,
  axis3: null,
  axis4: null,
  comment: '',
  email: '',
  emailOptIn: false,
};

export function RefonteForm() {
  const [vote, setVote] = useState<VoteState>(initial);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Iteration 1: log to console only. API route + Upstash come next.
    console.log('[refonte vote]', vote);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <h2 className="font-serif text-2xl text-slate-900">Merci.</h2>
        <p className="mt-3 text-slate-700">
          Ton vote a été enregistré (en console pour cette itération de dev).
          La synthèse sera publiée à la clôture de la consultation.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-16">
      {/* AXIS 1 — HERO VISUEL */}
      <Section
        index={1}
        title="Hero visuel"
        question="Quel objet domine le haut de la home et donne en deux secondes la nature du site ?"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Option
            name="axis1"
            value="thermometre"
            checked={vote.axis1 === 'thermometre'}
            onChange={(v) => setVote({ ...vote, axis1: v as Axis1 })}
            label="Thermomètre institutionnel"
            description="Une jauge composite qui mesure « l'état du fonctionnement institutionnel BXL », alimentée par la veille."
            previewHref="/refonte/preview/thermometre"
          >
            <ThermometerMockup />
          </Option>
          <Option
            name="axis1"
            value="mosaique"
            checked={vote.axis1 === 'mosaique'}
            onChange={(v) => setVote({ ...vote, axis1: v as Axis1 })}
            label="Mosaïque éditoriale"
            description="Pas un objet unique : 4 productions du moment en grand (digest, magazine, podcast, quiz)."
            previewHref="/refonte/preview/mosaique"
          >
            <MosaicMockup />
          </Option>
          <Option
            name="axis1"
            value="texte_fort"
            checked={vote.axis1 === 'texte_fort'}
            onChange={(v) => setVote({ ...vote, axis1: v as Axis1 })}
            label="Texte fort"
            description="Pas d'image, juste une phrase éditoriale énorme qui change avec l'actualité."
            previewHref="/refonte/preview/texte-fort"
          >
            <StrongTextMockup />
          </Option>
          <Option
            name="axis1"
            value="multilingue"
            checked={vote.axis1 === 'multilingue'}
            onChange={(v) => setVote({ ...vote, axis1: v as Axis1 })}
            label="Hero multilingue"
            description="Le multilingue lui-même est le héros : compteur de langues servies + phrase rotative."
            previewHref="/refonte/preview/multilingue"
          >
            <MultilingualMockup />
          </Option>
        </div>
      </Section>

      {/* AXIS 2 — TON ÉDITORIAL (stub) */}
      <SectionStub
        index={2}
        title="Ton éditorial"
        question="À quel point la home s'autorise-t-elle à respirer ?"
        note="Sample copy pour les 4 tons à intégrer dans la prochaine itération (sobre actuel · sobre + vivant · journalistique factuel · voix éditeur identifiée)."
      />

      {/* AXIS 3 — SURFACE ÉCOSYSTÈME (stub) */}
      <SectionStub
        index={3}
        title="Surface écosystème"
        question="Hors hero, comment surfacer digest / magazine / podcast / quiz / langues ?"
        note="3 mini-mockups à intégrer (mosaïque + bandeau multilingue · dispersé contextuellement · hub renvoyé hors home)."
      />

      {/* AXIS 4 — RYTHME (stub) */}
      <SectionStub
        index={4}
        title="Rythme"
        question="À quelle fréquence la home doit-elle changer ?"
        note="4 schémas SVG temporels à intégrer (quotidien · hebdo · sur événement · mixte)."
      />

      {/* GLOBAL COMMENT + EMAIL */}
      <section className="border-t border-slate-200 pt-12">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Quelque chose à ajouter sur tes choix ?
          </span>
          <textarea
            value={vote.comment}
            onChange={(e) => setVote({ ...vote, comment: e.target.value })}
            rows={4}
            placeholder="Optionnel. Tu peux préciser un axe (ex : « le hero multilingue m'a parlé parce que… »)."
            className="mt-3 w-full rounded border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
          />
        </label>

        <fieldset className="mt-8 space-y-3">
          <legend className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Suivre la suite (optionnel)
          </legend>
          <input
            type="email"
            value={vote.email}
            onChange={(e) => setVote({ ...vote, email: e.target.value })}
            placeholder="ton@email.be"
            className="w-full max-w-md rounded border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
          />
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={vote.emailOptIn}
              onChange={(e) => setVote({ ...vote, emailOptIn: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>
              Je veux recevoir l&apos;article de synthèse quand la consultation
              fermera. Je peux me désabonner à tout moment.
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          className="mt-10 inline-flex items-center gap-3 rounded bg-slate-900 px-6 py-3 font-mono text-sm uppercase tracking-[0.18em] text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!vote.axis1}
        >
          Envoyer mes votes
          <span aria-hidden>→</span>
        </button>
        {!vote.axis1 && (
          <p className="mt-3 text-xs text-slate-500">
            Itération en cours&nbsp;: seul l&apos;axe 1 est actif. Choisis une option ci-dessus pour activer le bouton.
          </p>
        )}
      </section>
    </form>
  );
}

// ---------- LAYOUT PRIMITIVES ----------

function Section({
  index,
  title,
  question,
  children,
}: {
  index: number;
  title: string;
  question: string;
  children: ReactNode;
}) {
  return (
    <section>
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          Axe {index} sur 4
        </p>
        <h2 className="mt-1 font-serif text-2xl text-slate-900 md:text-3xl">{title}</h2>
        <p className="mt-2 text-slate-700">{question}</p>
      </header>
      {children}
    </section>
  );
}

function SectionStub({
  index,
  title,
  question,
  note,
}: {
  index: number;
  title: string;
  question: string;
  note: string;
}) {
  return (
    <section className="rounded border border-dashed border-slate-300 bg-slate-50 p-6">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
        Axe {index} sur 4 — à intégrer
      </p>
      <h2 className="mt-1 font-serif text-2xl text-slate-900">{title}</h2>
      <p className="mt-2 text-slate-700">{question}</p>
      <p className="mt-4 text-sm italic text-slate-500">{note}</p>
    </section>
  );
}

function Option({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  children,
  previewHref,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  label: string;
  description: string;
  children: ReactNode;
  previewHref?: string;
}) {
  return (
    <div
      className={`group relative flex flex-col rounded-lg border-2 bg-white p-5 transition ${
        checked
          ? 'border-slate-900 shadow-sm'
          : 'border-slate-200 hover:border-slate-400'
      }`}
    >
      <label className="cursor-pointer">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={() => onChange(value)}
          className="sr-only"
        />
        <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded bg-slate-50">
          {children}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg text-slate-900">{label}</h3>
          <span
            aria-hidden
            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
              checked ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
            }`}
          >
            {checked && <span className="h-2 w-2 rounded-full bg-white" />}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      </label>
      {previewHref && (
        <Link
          // Locale-prefixed path is registered in routing.ts; cast keeps Option reusable.
          href={previewHref as Parameters<typeof Link>[0]['href']}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-fit items-center gap-2 rounded border-2 border-slate-900 bg-slate-900 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-slate-900"
        >
          Voir l&apos;aperçu pleine page
          <span aria-hidden>↗</span>
        </Link>
      )}
    </div>
  );
}

// ---------- HERO VISUAL MOCKUPS (axis 1) ----------

function ThermometerMockup() {
  // Static gauge at ~62/100. Real version would derive from veille metrics.
  const value = 62;
  return (
    <div className="w-full px-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          Indice fonctionnement BXL
        </span>
        <span className="font-serif text-xl text-slate-900">{value}<span className="text-xs text-slate-500">/100</span></span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500"
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-900"
          style={{ left: `${value}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-400">
        <span>Crise</span>
        <span>Fonctionnel</span>
      </div>
    </div>
  );
}

function MosaicMockup() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-1.5 p-3">
      <div className="flex flex-col justify-between rounded bg-slate-900 p-2 text-white">
        <span className="font-mono text-[8px] uppercase tracking-wider opacity-60">
          Digest
        </span>
        <span className="font-serif text-[10px] leading-tight">S17 — 8 signaux</span>
      </div>
      <div className="flex flex-col justify-between rounded bg-amber-50 p-2">
        <span className="font-mono text-[8px] uppercase tracking-wider text-amber-700">
          Magazine
        </span>
        <span className="font-serif text-[10px] leading-tight text-slate-900">
          #17
        </span>
      </div>
      <div className="flex flex-col justify-between rounded bg-blue-50 p-2">
        <span className="font-mono text-[8px] uppercase tracking-wider text-blue-700">
          Podcast
        </span>
        <span className="font-serif text-[10px] leading-tight text-slate-900">
          Le briefing FR/NL
        </span>
      </div>
      <div className="flex flex-col justify-between rounded bg-emerald-50 p-2">
        <span className="font-mono text-[8px] uppercase tracking-wider text-emerald-700">
          Quiz
        </span>
        <span className="font-serif text-[10px] leading-tight text-slate-900">
          10 questions
        </span>
      </div>
    </div>
  );
}

function StrongTextMockup() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <p className="text-sm leading-tight text-slate-900 md:text-base">
        186 nationalités.
        <br />
        <span className="text-slate-500">19 communes.</span>
        <br />
        Une seule région.
      </p>
    </div>
  );
}

function MultilingualMockup() {
  const langs = ['FR', 'NL', 'EN', 'DE', 'IT', 'ES', 'PT', 'AR', 'TR', 'UK', 'PL', 'RO'];
  return (
    <div className="flex h-full w-full flex-col justify-center px-4">
      <div className="mb-3">
        <span className="font-serif text-2xl text-slate-900">12</span>
        <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          langues servies
        </span>
        <span className="ml-2 font-mono text-[10px] text-slate-400">/ 79 cible</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {langs.map((l) => (
          <span
            key={l}
            className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-600"
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
