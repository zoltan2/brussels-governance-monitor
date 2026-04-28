// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

type Axis1 = 'thermometre' | 'mosaique' | 'texte_fort' | 'multilingue';
type Axis2 = 'sobre_actuel' | 'sobre_vivant' | 'journalistique' | 'voix_editeur';
type Axis3 =
  | 'digest'
  | 'magazine'
  | 'podcast'
  | 'quiz'
  | 'multilingue'
  | 'plusieurs';
type Axis4 = 'quotidien' | 'hebdo' | 'evenement' | 'mixte';
type Axis5 = 'minimal' | 'standard' | 'chiffres' | 'complete';

interface VoteState {
  axis1: Axis1 | null;
  axis2: Axis2 | null;
  axis3: Axis3 | null;
  axis4: Axis4 | null;
  axis5: Axis5 | null;
  comment: string;
  email: string;
  emailOptIn: boolean;
}

const initial: VoteState = {
  axis1: null,
  axis2: null,
  axis3: null,
  axis4: null,
  axis5: null,
  comment: '',
  email: '',
  emailOptIn: false,
};

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; message: string };

export function RefonteForm() {
  const [vote, setVote] = useState<VoteState>(initial);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitState({ status: 'submitting' });

    try {
      const res = await fetch('/api/refonte-vote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(vote),
      });

      if (res.ok) {
        setSubmitState({ status: 'success' });
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      const message =
        data.message ??
        (data.error === 'already_voted'
          ? 'Tu as déjà voté depuis ce navigateur.'
          : data.error === 'invalid_payload'
            ? "Une option sélectionnée n'est pas reconnue. Recharge la page et réessaie."
            : data.error === 'storage_unavailable'
              ? 'Le serveur de votes est temporairement indisponible. Réessaie dans une minute.'
              : 'Erreur inconnue. Réessaie dans une minute.');
      setSubmitState({ status: 'error', message });
    } catch (err) {
      console.error('[refonte-form] submit failed:', err);
      setSubmitState({
        status: 'error',
        message: 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.',
      });
    }
  }

  if (submitState.status === 'success') {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <h2 className="text-2xl text-slate-900">Merci.</h2>
        <p className="mt-3 text-slate-700">
          Ton vote a été enregistré. La synthèse — quantitatifs, thèmes des
          commentaires et décisions assumées par axe — sera publiée à la
          clôture de la consultation.
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

      {/* AXIS 3 — PRODUCTIONS PRÉFÉRÉES */}
      <Section
        index={3}
        title="Productions préférées"
        question="Si tu ne devais en garder qu'une parmi les productions BGM, ce serait laquelle ?"
      >
        <p className="mb-6 text-sm italic text-slate-500">
          Question utilisateur, pas designer : on cherche à savoir ce qui te parle le plus. Sert ensuite à choisir quelles productions mettre en avant.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Option
            name="axis3"
            value="digest"
            checked={vote.axis3 === 'digest'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Le digest hebdomadaire"
            description="Les 8 signaux institutionnels de la semaine, lus en 5 minutes. L'épine dorsale éditoriale."
          >
            <ProductionMockup variant="digest" />
          </Option>
          <Option
            name="axis3"
            value="magazine"
            checked={vote.axis3 === 'magazine'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Le magazine"
            description="Les 8 signaux racontés à l'horizontale, 14 pages mises en récit visuel."
          >
            <ProductionMockup variant="magazine" />
          </Option>
          <Option
            name="axis3"
            value="podcast"
            checked={vote.axis3 === 'podcast'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Le podcast"
            description="La semaine racontée à voix haute, 15 minutes, en français et néerlandais."
          >
            <ProductionMockup variant="podcast" />
          </Option>
          <Option
            name="axis3"
            value="quiz"
            checked={vote.axis3 === 'quiz'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Le quiz"
            description="10 questions sur la gouvernance bruxelloise, en quatre langues."
          >
            <ProductionMockup variant="quiz" />
          </Option>
          <Option
            name="axis3"
            value="multilingue"
            checked={vote.axis3 === 'multilingue'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Le multilingue"
            description="Lire BGM dans ma langue. 12 langues actives, cible 79."
          >
            <ProductionMockup variant="multilingue" />
          </Option>
          <Option
            name="axis3"
            value="plusieurs"
            checked={vote.axis3 === 'plusieurs'}
            onChange={(v) => setVote({ ...vote, axis3: v as Axis3 })}
            label="Plusieurs à égalité"
            description="J'arrive pas à choisir. Plusieurs productions me parlent autant les unes que les autres."
          >
            <ProductionMockup variant="plusieurs" />
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

      {/* AXIS 5 — STYLE DE CARTE RÉSUMÉ */}
      <Section
        index={5}
        title="Style de carte résumé"
        question="Quand tu lis une fiche BGM (un domaine, un dossier, une commune), qu'est-ce que tu préfères trouver ?"
      >
        <p className="mb-6 text-sm italic text-slate-500">
          Même fiche (Logement / SLRB) déclinée en 4 densités. La comparaison porte sur la quantité d&apos;information par carte, pas sur le sujet.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Option
            name="axis5"
            value="minimal"
            checked={vote.axis5 === 'minimal'}
            onChange={(v) => setVote({ ...vote, axis5: v as Axis5 })}
            label="Minimaliste"
            description="Titre + 1 phrase d'accroche. Force à cliquer pour le détail. Lecture en une seconde."
          >
            <CardSampleMockup variant="minimal" />
          </Option>
          <Option
            name="axis5"
            value="standard"
            checked={vote.axis5 === 'standard'}
            onChange={(v) => setVote({ ...vote, axis5: v as Axis5 })}
            label="Standard + statut"
            description="Titre + 2 lignes + indicateur d'état coloré. Bon équilibre. Proche de la home actuelle."
          >
            <CardSampleMockup variant="standard" />
          </Option>
          <Option
            name="axis5"
            value="chiffres"
            checked={vote.axis5 === 'chiffres'}
            onChange={(v) => setVote({ ...vote, axis5: v as Axis5 })}
            label="Synthèse chiffrée"
            description="Titre + 2 lignes + 3 chiffres clés inline. La carte donne les ordres de grandeur."
          >
            <CardSampleMockup variant="chiffres" />
          </Option>
          <Option
            name="axis5"
            value="complete"
            checked={vote.axis5 === 'complete'}
            onChange={(v) => setVote({ ...vote, axis5: v as Axis5 })}
            label="Synthèse complète"
            description="Titre + lead + chiffres + dernière mise à jour + tag dossier. La carte fait le travail de l'article."
          >
            <CardSampleMockup variant="complete" />
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
          disabled={
            submitState.status === 'submitting' ||
            !vote.axis1 ||
            !vote.axis2 ||
            !vote.axis3 ||
            !vote.axis4 ||
            !vote.axis5
          }
        >
          {submitState.status === 'submitting' ? 'Envoi…' : 'Envoyer mes votes'}
          <span aria-hidden>→</span>
        </button>
        {(!vote.axis1 ||
          !vote.axis2 ||
          !vote.axis3 ||
          !vote.axis4 ||
          !vote.axis5) && (
          <p className="mt-3 text-xs text-slate-500">
            Choisis une option sur chacun des 5 axes pour activer le bouton.
          </p>
        )}
        {submitState.status === 'error' && (
          <p
            role="alert"
            className="mt-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {submitState.message}
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

// ---------- PRODUCTION MOCKUPS (axis 3) ----------

type ProductionVariant =
  | 'digest'
  | 'magazine'
  | 'podcast'
  | 'quiz'
  | 'multilingue'
  | 'plusieurs';

function ProductionMockup({ variant }: { variant: ProductionVariant }) {
  if (variant === 'digest') {
    return (
      <div className="flex h-full w-full flex-col justify-center bg-slate-900 p-4 text-white">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
          Digest hebdo · S17
        </span>
        <p className="mt-2 text-sm leading-tight">8 signaux pour comprendre la semaine.</p>
        <span className="mt-3 font-mono text-[10px] uppercase tracking-wider text-white/50">
          ~5 min · FR / NL / EN / DE
        </span>
      </div>
    );
  }
  if (variant === 'magazine') {
    return (
      <div className="flex h-full w-full flex-col justify-center bg-amber-50 p-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-700">
          Magazine #17
        </span>
        <p className="mt-2 text-sm leading-tight text-slate-900">
          Les 8 signaux à l&apos;horizontale, 14 pages.
        </p>
        <span className="mt-3 font-mono text-[10px] uppercase tracking-wider text-amber-700/60">
          magazine.governance.brussels
        </span>
      </div>
    );
  }
  if (variant === 'podcast') {
    return (
      <div className="flex h-full w-full flex-col justify-center bg-blue-950 p-4 text-white">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-200">
          Podcast · FR + NL
        </span>
        <p className="mt-2 text-sm leading-tight">Le briefing : la semaine en 15 minutes.</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/30">
            <span aria-hidden className="ml-0.5 border-y-[3px] border-l-[5px] border-y-transparent border-l-white" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
            Écouter
          </span>
        </div>
      </div>
    );
  }
  if (variant === 'quiz') {
    return (
      <div className="flex h-full w-full flex-col justify-center border border-emerald-200 bg-white p-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-700">
          Quiz · 4 langues
        </span>
        <p className="mt-2 text-sm leading-tight text-slate-900">
          10 questions sur Bruxelles.
        </p>
        <span className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          224 questions · pool aléatoire
        </span>
      </div>
    );
  }
  if (variant === 'multilingue') {
    return (
      <div className="flex h-full w-full flex-col justify-center bg-white p-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
          Lisible aujourd&apos;hui en
        </span>
        <p className="mt-2 font-mono text-3xl font-bold leading-none tabular-nums text-slate-900">
          12<span className="ml-1 text-base text-slate-400">/79</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {['FR', 'NL', 'EN', 'DE', 'IT', 'ES', '+6'].map((l) => (
            <span
              key={l}
              className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[9px] text-slate-600"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    );
  }
  // plusieurs
  return (
    <div className="flex h-full w-full flex-col justify-center bg-slate-50 p-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
        À égalité
      </span>
      <div className="mt-3 grid grid-cols-3 gap-1">
        <span className="rounded-sm bg-slate-900 py-1 text-center font-mono text-[8px] uppercase tracking-wider text-white">
          Digest
        </span>
        <span className="rounded-sm bg-amber-100 py-1 text-center font-mono text-[8px] uppercase tracking-wider text-amber-800">
          Mag
        </span>
        <span className="rounded-sm bg-blue-100 py-1 text-center font-mono text-[8px] uppercase tracking-wider text-blue-800">
          Podcast
        </span>
        <span className="rounded-sm bg-emerald-100 py-1 text-center font-mono text-[8px] uppercase tracking-wider text-emerald-800">
          Quiz
        </span>
        <span className="col-span-2 rounded-sm border border-dashed border-slate-300 py-1 text-center font-mono text-[8px] uppercase tracking-wider text-slate-500">
          12 langues
        </span>
      </div>
    </div>
  );
}

// ---------- CARD SAMPLE MOCKUPS (axis 5) ----------

type CardVariant = 'minimal' | 'standard' | 'chiffres' | 'complete';

function CardSampleMockup({ variant }: { variant: CardVariant }) {
  // Same fact (Logement / SLRB) at 4 densities.
  if (variant === 'minimal') {
    return (
      <div className="flex h-full w-full flex-col justify-center border-l-2 border-slate-900 bg-white p-4">
        <h4 className="text-sm font-semibold tracking-tight text-slate-900">
          Logement social : SLRB en panne.
        </h4>
        <span className="mt-2 font-mono text-[10px] uppercase tracking-wider text-slate-400">
          Voir le dossier →
        </span>
      </div>
    );
  }
  if (variant === 'standard') {
    return (
      <div className="flex h-full w-full flex-col justify-center bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Logement
          </span>
        </div>
        <h4 className="text-sm font-semibold leading-tight tracking-tight text-slate-900">
          SLRB : la pression monte sur le logement social.
        </h4>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
          Aucune livraison annoncée pour 2026. Le ministre est interpellé en commission.
        </p>
      </div>
    );
  }
  if (variant === 'chiffres') {
    return (
      <div className="flex h-full w-full flex-col justify-center bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Logement
          </span>
        </div>
        <h4 className="text-sm font-semibold leading-tight tracking-tight text-slate-900">
          SLRB : la pression monte.
        </h4>
        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2">
          <div>
            <span className="block font-mono text-sm font-bold tabular-nums text-slate-900">39 000</span>
            <span className="block font-mono text-[8px] uppercase tracking-wider text-slate-400">demandes</span>
          </div>
          <div>
            <span className="block font-mono text-sm font-bold tabular-nums text-slate-900">0</span>
            <span className="block font-mono text-[8px] uppercase tracking-wider text-slate-400">livraison 26</span>
          </div>
          <div>
            <span className="block font-mono text-sm font-bold tabular-nums text-slate-900">18 ans</span>
            <span className="block font-mono text-[8px] uppercase tracking-wider text-slate-400">attente</span>
          </div>
        </div>
      </div>
    );
  }
  // complete
  return (
    <div className="flex h-full w-full flex-col justify-between bg-white p-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Logement
            </span>
          </div>
          <span className="rounded-sm bg-slate-100 px-1.5 font-mono text-[8px] uppercase tracking-wider text-slate-700">
            Dossier SLRB
          </span>
        </div>
        <h4 className="text-sm font-semibold leading-tight tracking-tight text-slate-900">
          SLRB : la pression monte.
        </h4>
        <p className="mt-1 text-[10px] leading-snug text-slate-600">
          Aucune livraison annoncée pour 2026. Interpellation en commission.
        </p>
      </div>
      <div>
        <div className="grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-1.5">
          <span className="font-mono text-[9px] tabular-nums text-slate-700">
            <strong className="text-slate-900">39 000</strong> dem.
          </span>
          <span className="font-mono text-[9px] tabular-nums text-slate-700">
            <strong className="text-slate-900">0</strong> livr. 26
          </span>
          <span className="font-mono text-[9px] tabular-nums text-slate-700">
            <strong className="text-slate-900">18a</strong> attente
          </span>
        </div>
        <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-wider text-slate-400">
          Mis à jour 27/04/26
        </span>
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
