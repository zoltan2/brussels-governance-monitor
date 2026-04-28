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

      {/* AXIS 2 — TON ÉDITORIAL */}
      <Section
        index={2}
        title="Ton éditorial"
        question="Pour la home (pas forcément pour les fiches), à quel point la voix s'autorise-t-elle à respirer ?"
      >
        <p className="mb-6 text-sm italic text-slate-500">
          Même fait illustré dans les 4 tons : « Le budget régional 2026 passe en deuxième lecture au Parlement bruxellois ».
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Option
            name="axis2"
            value="sobre_actuel"
            checked={vote.axis2 === 'sobre_actuel'}
            onChange={(v) => setVote({ ...vote, axis2: v as Axis2 })}
            label="Sobre institutionnel actuel"
            description="On ne change rien. Voix institutionnelle, sourcing strict, aucun verbe affirmé. Option « refus du changement »."
          >
            <ToneSampleCopy
              title="Le projet de budget 2026 entre en deuxième lecture"
              lead="Le Parlement bruxellois examine cette semaine le projet de budget 2026 du gouvernement régional sortant. Vote prévu en mai."
            />
          </Option>
          <Option
            name="axis2"
            value="sobre_vivant"
            checked={vote.axis2 === 'sobre_vivant'}
            onChange={(v) => setVote({ ...vote, axis2: v as Axis2 })}
            label="Sobre + vivant"
            description="Sourcing et règles inchangés mais titres plus saillants, leads mieux écrits, verbes forts à la place des participes."
          >
            <ToneSampleCopy
              title="Budget 2026 : le Parlement reprend la main"
              lead="Après un premier passage tendu, le projet de budget revient devant les députés cette semaine. Vote attendu en mai."
            />
          </Option>
          <Option
            name="axis2"
            value="journalistique"
            checked={vote.axis2 === 'journalistique'}
            onChange={(v) => setVote({ ...vote, axis2: v as Axis2 })}
            label="Journalistique factuel"
            description="Angles affirmés, leads, accroches narratives. Pas militant, pas timide. Modèle Le Monde / Reuters."
          >
            <ToneSampleCopy
              title="Budget 2026 : deuxième lecture sous tension au Parlement bruxellois"
              lead="Le projet du gouvernement sortant est contesté sur trois lignes — sécurité, mobilité, logement. Vote serré attendu en mai."
            />
          </Option>
          <Option
            name="axis2"
            value="voix_editeur"
            checked={vote.axis2 === 'voix_editeur'}
            onChange={(v) => setVote({ ...vote, axis2: v as Axis2 })}
            label="Voix éditeur identifiée"
            description="Première personne, point de vue assumé. Très distinctif, très clivant en Belgique. Engage personnellement."
          >
            <ToneSampleCopy
              title="Ce budget que je suis depuis novembre"
              lead="On entame la deuxième lecture cette semaine. J'ai relu les amendements : les arbitrages-clé sont sur la sécurité et le logement. Voici ce que j'en lis."
            />
          </Option>
        </div>
      </Section>

      {/* AXIS 3 — SURFACE ÉCOSYSTÈME */}
      <Section
        index={3}
        title="Surface écosystème"
        question="Hors hero, comment surfacer l'écosystème (digest, magazine, podcast, quiz, langues) ?"
      >
        <p className="mb-6 text-sm italic text-slate-500">
          Les 3 aperçus partagent le même hero neutre. Ce qui change est la zone juste en dessous.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Option
            name="axis3"
            value="mosaique_multi"
            checked={vote.axis3 === 'mosaique_multi'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Section dédiée + bandeau multilingue"
            description="Une bande horizontale dédiée, vignettes-cartes des productions + rangée explicite des langues servies aujourd'hui."
            previewHref="/refonte/preview/surface-mosaique"
          >
            <SurfaceMosaicMockup />
          </Option>
          <Option
            name="axis3"
            value="disperse"
            checked={vote.axis3 === 'disperse'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Dispersé contextuellement"
            description="Pas de section dédiée. Chaque format apparaît à sa place naturelle (podcast à côté d'un dossier audio, quiz à côté d'un sujet, etc.)."
            previewHref="/refonte/preview/surface-disperse"
          >
            <SurfaceDisperseMockup />
          </Option>
          <Option
            name="axis3"
            value="hub_externe"
            checked={vote.axis3 === 'hub_externe'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Hub renvoyé hors home"
            description="La home tease 1-2 productions seulement. Le reste vit sur une page dédiée /productions. Allège la home, oblige un clic."
            previewHref="/refonte/preview/surface-hub"
          >
            <SurfaceHubMockup />
          </Option>
        </div>
      </Section>

      {/* AXIS 4 — RYTHME */}
      <Section
        index={4}
        title="Rythme"
        question="À quelle fréquence la home doit-elle changer ?"
      >
        <p className="mb-6 text-sm italic text-slate-500">
          Chaque schéma représente deux semaines. Un point coloré = la home a bougé ce jour-là.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Option
            name="axis4"
            value="quotidien"
            checked={vote.axis4 === 'quotidien'}
            onChange={(v) => setVote({ ...vote, axis4: v as Axis4 })}
            label="Quotidien"
            description="Un objet bouge tous les jours (fait du jour, phrase qui tourne, compteur live). Coût éditorial élevé."
          >
            <RhythmSchema pattern="daily" />
          </Option>
          <Option
            name="axis4"
            value="hebdo"
            checked={vote.axis4 === 'hebdo'}
            onChange={(v) => setVote({ ...vote, axis4: v as Axis4 })}
            label="Hebdomadaire"
            description="Synchrone avec digest/magazine/podcast (chaque lundi). Soutenable, prévisible."
          >
            <RhythmSchema pattern="weekly" />
          </Option>
          <Option
            name="axis4"
            value="evenement"
            checked={vote.axis4 === 'evenement'}
            onChange={(v) => setVote({ ...vote, axis4: v as Axis4 })}
            label="Sur événement"
            description="Change seulement quand quelque chose mérite. Authentique mais peut sembler dormant entre."
          >
            <RhythmSchema pattern="event" />
          </Option>
          <Option
            name="axis4"
            value="mixte"
            checked={vote.axis4 === 'mixte'}
            onChange={(v) => setVote({ ...vote, axis4: v as Axis4 })}
            label="Mixte"
            description="Couche quotidienne légère (compteur, phrase) sur fond hebdo cadencé sur les productions."
          >
            <RhythmSchema pattern="mixed" />
          </Option>
        </div>
      </Section>

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
          disabled={!vote.axis1 || !vote.axis2 || !vote.axis3 || !vote.axis4}
        >
          Envoyer mes votes
          <span aria-hidden>→</span>
        </button>
        {(!vote.axis1 || !vote.axis2 || !vote.axis3 || !vote.axis4) && (
          <p className="mt-3 text-xs text-slate-500">
            Choisis une option sur chacun des 4 axes pour activer le bouton.
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

// ---------- RHYTHM SCHEMA (axis 4) ----------

type RhythmPattern = 'daily' | 'weekly' | 'event' | 'mixed';

const DAYS_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D', 'L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface BarShape {
  // Height fraction of max (0 — 1).
  h: number;
  // Color intensity: 'strong' | 'soft' | 'faint'.
  c: 'strong' | 'soft' | 'faint';
}

function RhythmSchema({ pattern }: { pattern: RhythmPattern }) {
  const bars: BarShape[] = (() => {
    switch (pattern) {
      case 'daily':
        // Tous les jours, toutes les barres sont fortes et hautes.
        return DAYS_LABELS.map(() => ({ h: 1, c: 'strong' as const }));
      case 'weekly':
        // Seuls les lundis (positions 0 et 7) ont une barre, le reste est imperceptible.
        return DAYS_LABELS.map((_, i) =>
          i === 0 || i === 7
            ? { h: 1, c: 'strong' as const }
            : { h: 0.08, c: 'faint' as const },
        );
      case 'event':
        // 3 pics irréguliers sur 14 jours, hauteurs variées.
        return DAYS_LABELS.map((_, i) => {
          if (i === 2) return { h: 0.85, c: 'strong' as const };
          if (i === 9) return { h: 1, c: 'strong' as const };
          if (i === 12) return { h: 0.6, c: 'strong' as const };
          return { h: 0.08, c: 'faint' as const };
        });
      case 'mixed':
        // Lundis forts + chaque autre jour une pulsation moyenne.
        return DAYS_LABELS.map((_, i) =>
          i === 0 || i === 7
            ? { h: 1, c: 'strong' as const }
            : { h: 0.35, c: 'soft' as const },
        );
    }
  })();

  const captions: Record<RhythmPattern, string> = {
    daily: 'Tous les jours',
    weekly: 'Le lundi, et seulement le lundi',
    event: 'Quand un événement le mérite',
    mixed: 'Ancrage lundi + pulse quotidien léger',
  };

  return (
    <div className="flex h-full w-full flex-col justify-between px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-700">
        {captions[pattern]}
      </p>
      <div className="flex h-16 items-end gap-[3px]">
        {bars.map((b, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${
              b.c === 'strong'
                ? 'bg-slate-900'
                : b.c === 'soft'
                  ? 'bg-slate-400'
                  : 'bg-slate-200'
            } ${i === 7 ? 'ml-1 border-l border-dashed border-slate-300 pl-1' : ''}`}
            style={{ height: `${b.h * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400">
        <span>S1 · L M M J V S D</span>
        <span>S2 · L M M J V S D</span>
      </div>
    </div>
  );
}

// ---------- SURFACE THUMBNAILS (axis 3) ----------

function SurfaceMosaicMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 px-3">
      <div className="rounded-sm bg-slate-200 px-2 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-slate-500">
        hero
      </div>
      <div className="grid grid-cols-4 gap-1">
        <div className="h-5 rounded-sm bg-slate-900" />
        <div className="h-5 rounded-sm bg-amber-200" />
        <div className="h-5 rounded-sm bg-blue-200" />
        <div className="h-5 rounded-sm bg-emerald-200" />
      </div>
      <div className="rounded-sm border border-dashed border-slate-300 bg-white px-2 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-slate-500">
        FR · NL · EN · DE · …
      </div>
      <div className="rounded-sm bg-slate-100 px-2 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-slate-400">
        suite home
      </div>
    </div>
  );
}

function SurfaceDisperseMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 px-3">
      <div className="rounded-sm bg-slate-200 px-2 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-slate-500">
        hero
      </div>
      <div className="rounded-sm bg-slate-100 p-1.5">
        <div className="h-1 w-3/4 rounded-full bg-slate-400" />
        <div className="mt-1 flex items-center gap-1">
          <span className="rounded-sm bg-blue-200 px-1 font-mono text-[7px] text-blue-800">PODCAST</span>
          <div className="h-1 flex-1 rounded-full bg-slate-300" />
        </div>
      </div>
      <div className="rounded-sm bg-slate-100 p-1.5">
        <div className="h-1 w-2/3 rounded-full bg-slate-400" />
        <div className="mt-1 flex items-center gap-1">
          <span className="rounded-sm bg-emerald-200 px-1 font-mono text-[7px] text-emerald-800">QUIZ</span>
          <div className="h-1 flex-1 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

function SurfaceHubMockup() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 px-3">
      <div className="rounded-sm bg-slate-200 px-2 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-slate-500">
        hero
      </div>
      <div className="flex items-center justify-between rounded-sm bg-slate-100 px-2 py-1">
        <span className="font-mono text-[8px] text-slate-600">Digest S17 →</span>
      </div>
      <div className="flex items-center justify-between rounded-sm border border-slate-900 bg-white px-2 py-1">
        <span className="font-mono text-[8px] uppercase tracking-wider text-slate-900">
          Tout l&apos;écosystème
        </span>
        <span className="font-mono text-[8px] text-slate-900">↗</span>
      </div>
      <div className="rounded-sm bg-slate-100 px-2 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-slate-400">
        suite home
      </div>
    </div>
  );
}

// ---------- TONE SAMPLE (axis 2) ----------

function ToneSampleCopy({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="flex h-full w-full flex-col justify-center px-4 text-left">
      <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
        Exemple, comme rendu sur la home
      </p>
      <h4 className="text-sm leading-tight tracking-tight text-slate-900 md:text-base">
        {title}
      </h4>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-600 md:text-xs">
        {lead}
      </p>
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
