// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// PROTOTYPE LOCAL (branche proto/accueil-refonte). Textes FR en dur.
//
// The homepage is prerendered once per deploy, so the "question of the day" must be
// picked in the browser from the visitor's date, never at build time. The pool
// (public/quiz-data-{locale}.json, ~80 KB) is only fetched once the card nears the viewport.
//
// Once answered, the explanation REPLACES the four buttons: the card height barely moves,
// the verdict always names the right answer, and there is no disabled control left behind.

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  sourceSlug: string;
  sourceTitle: string;
}

// v2: choices are indexes into the shuffled options (v1 stored unshuffled indexes).
const STORAGE_KEY = 'bgm-daily-question-v2';

const LETTERS = ['A', 'B', 'C', 'D'];

function localDateKey(now: Date): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Deterministic index for a calendar day. The step (7) is coprime with typical pool
 *  sizes, so consecutive days jump across domains instead of walking one topic. */
function dayIndex(dateKey: string, poolSize: number): number {
  const days = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000);
  return (days * 7) % poolSize;
}

/** The pool stores the right answer first: shuffle the options, seeded by day and
 *  question, so the order is stable across reloads but never gives the answer away. */
function shuffleOptions(q: QuizQuestion, seedKey: string): QuizQuestion {
  let seed = 0;
  for (const ch of `${seedKey}:${q.id}`) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) | 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const correctText = q.options[q.correct];
  const options = [...q.options];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...q, options, correct: options.indexOf(correctText) };
}

function loadSavedChoice(dateKey: string, id: string): number | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved && saved.date === dateKey && saved.id === id && Number.isInteger(saved.choice)
      ? saved.choice
      : null;
  } catch {
    return null;
  }
}

function saveChoice(dateKey: string, id: string, choice: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: dateKey, id, choice }));
  } catch {
    // Private mode or blocked storage: the answer simply isn't remembered.
  }
}

/** `showHeading` : dans le panneau des jeux, le bandeau titre déjà la question. On ne
 *  répète pas le titre à l'écran, mais le groupe garde un nom accessible. */
export function DailyQuestion({
  locale,
  showHeading = true,
}: {
  locale: string;
  showHeading?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [dateKey, setDateKey] = useState('');
  const [choice, setChoice] = useState<number | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || status !== 'idle') return;

    const load = () => {
      setStatus('loading');
      const today = localDateKey(new Date());
      fetch(`/quiz-data-${locale}.json`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((data: { questions: QuizQuestion[] }) => {
          if (!data.questions?.length) throw new Error('empty pool');
          const q = shuffleOptions(data.questions[dayIndex(today, data.questions.length)], today);
          setDateKey(today);
          setQuestion(q);
          setChoice(loadSavedChoice(today, q.id));
          setStatus('ready');
        })
        .catch(() => setStatus('error'));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [locale, status]);

  const answer = (i: number) => {
    if (!question || choice !== null) return;
    setChoice(i);
    saveChoice(dateKey, question.id, i);
    // One mechanism only: the focus lands on the verdict, which is read where it is.
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const answered = question !== null && choice !== null;
  const isRight = answered && choice === question.correct;

  return (
    <div
      ref={rootRef}
      role="group"
      aria-labelledby={showHeading ? 'daily-question-title' : undefined}
      aria-label={showHeading ? undefined : 'La question du jour'}
      className="flex h-full flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      {showHeading && (
        <h4 id="daily-question-title" className="text-base font-semibold text-neutral-900">
          La question du jour
        </h4>
      )}

      <div className="min-h-[13rem]">
        {(status === 'idle' || status === 'loading') && (
          <>
            <p role="status" className="sr-only">
              Chargement de la question du jour…
            </p>
            <div className="mt-3 space-y-2" aria-hidden="true">
              <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-neutral-200" />
              <div className="grid grid-cols-2 gap-1.5 pt-2">
                {[0, 1, 2, 3].map((k) => (
                  <div key={k} className="h-11 animate-pulse rounded bg-neutral-200" />
                ))}
              </div>
            </div>
          </>
        )}

        {status === 'error' && (
          <div className="mt-3">
            <p role="alert" className="text-sm text-neutral-700">
              La question du jour n’a pas pu être chargée.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-2 cursor-pointer rounded-md border border-neutral-500 px-3 py-1.5 text-sm font-medium text-neutral-900 transition-colors hover:border-brand-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
            >
              Réessayer
            </button>
          </div>
        )}

        {status === 'ready' && question && (
          <>
            <p className="mt-2 text-sm font-semibold leading-snug text-neutral-900">{question.question}</p>

            {!answered && (
              <>
                <p className="mt-1 text-xs text-neutral-600">
                  Choisissez une réponse pour voir l’explication.
                </p>
                <div role="group" aria-label="Réponses possibles" className="mt-2 grid grid-cols-2 gap-1.5">
                  {question.options.map((option, i) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => answer(i)}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-neutral-500 bg-neutral-50 px-2.5 py-2 text-left text-sm leading-snug text-neutral-900 transition-colors hover:border-brand-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded bg-neutral-200 text-xs font-bold text-neutral-700"
                      >
                        {LETTERS[i]}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}

            {answered && (
              <div
                ref={resultRef}
                tabIndex={-1}
                className="mt-3 rounded-md bg-neutral-100 p-3 focus:outline-none"
              >
                <p className="text-sm font-semibold text-neutral-900">
                  {isRight ? 'Bravo, c’est la bonne réponse : ' : 'Pas tout à fait. La bonne réponse est : '}
                  {question.options[question.correct]}
                </p>
                {!isRight && (
                  <p className="mt-1 text-xs text-neutral-600">
                    Votre réponse : {question.options[choice]}
                  </p>
                )}
                <p className="mt-2 text-sm leading-snug text-neutral-700">{question.explanation}</p>
                <a
                  href={question.sourceSlug}
                  className="mt-2 inline-flex items-baseline gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline"
                >
                  Voir la fiche : {question.sourceTitle}
                </a>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-auto pt-3">
        <Link
          href="/quiz"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline"
        >
          {answered ? 'Continuer avec le quiz complet (10 questions)' : 'Faire le quiz complet (10 questions)'}
          <ArrowRight size={14} aria-hidden={true} />
        </Link>
      </div>
    </div>
  );
}
