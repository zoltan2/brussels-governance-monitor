// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReviewCard, QuestionBlock } from '@/lib/quiz-review-queue';

/**
 * Liste de relecture.
 *
 * Trois choix qui ne se voient pas dans le code mais qui viennent de revues :
 *
 * 1. La barre d'envoi passe par `createPortal` sur `document.body`. Le
 *    `<header>` du site porte `backdrop-filter`, qui casse `position: fixed`
 *    chez ses descendants — une barre écrite naïvement disparaît au défilement
 *    sur téléphone. Le composant `content/action-bar.tsx` n'est PAS réutilisé :
 *    il est modelé sur la fusion d'une PR de veille, l'étendre reviendrait à
 *    modifier ce chemin de publication.
 * 2. La bonne réponse est marquée par le TEXTE, jamais par la couleur : la
 *    palette du projet n'a aucun jeton vert, et une teinte seule échouerait à
 *    l'exigence d'accessibilité.
 * 3. « Retirer du quiz » dit ce qu'il fait — la question sort du pool servi —
 *    et sa note se saisit AVANT validation, pas après.
 */

type Status = 'approved' | 'rejected';

interface Decision {
  locale: string;
  questionId: string;
  status: Status;
  note?: string;
}

const LOCALE_LABEL: Record<string, string> = {
  fr: 'français',
  nl: 'néerlandais',
  en: 'anglais',
  de: 'allemand',
};

export function QuizReviewList({
  cards,
  shas,
  openPrs,
}: {
  cards: ReviewCard[];
  shas: Record<string, string>;
  openPrs: Array<{ number: number; branch: string; sha: string }>;
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [removing, setRemoving] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Le portail a besoin de `document.body`, qui n'existe pas au rendu serveur.
  // Ce drapeau est le motif standard ; la règle est désactivée ici comme dans
  // `chat-widget.tsx`, pour la même raison.
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setMounted(true), []);

  const sessionOpen = openPrs.length > 0;
  const taken = Object.values(decisions);
  const approved = taken.filter((d) => d.status === 'approved').length;
  const rejected = taken.filter((d) => d.status === 'rejected').length;
  const totalBlocks = cards.reduce((n, c) => n + Object.keys(c.blocks).length, 0);

  function decide(card: ReviewCard, locale: string, status: Status, noteText?: string) {
    const key = `${locale}:${card.id}`;
    setDecisions((d) => ({
      ...d,
      [key]: { locale, questionId: card.id, status, note: noteText || undefined },
    }));
  }

  function undo(key: string) {
    setDecisions((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  }

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/quiz/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: taken, shas }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Enregistrement impossible');
        return;
      }
      window.location.reload();
    } catch {
      // Un envoi perdu sans message, c'est douze relectures à refaire.
      setError('Envoi interrompu — rien n’a été enregistré, réessayez.');
    } finally {
      setSending(false);
    }
  }

  if (cards.length === 0) return null;

  return (
    <>
      {sessionOpen && (
        <div
          role="status"
          className="mt-6 rounded-lg border border-status-delayed bg-neutral-50 p-4 text-sm text-neutral-800"
        >
          Une session de relecture est déjà ouverte —{' '}
          {openPrs.map((p) => `PR #${p.number}`).join(', ')}. Fusionnez-la avant d’en
          commencer une autre : deux sessions parallèles réécrivent le même fichier
          d’état et la seconde fusion casserait.
        </div>
      )}

      <ol className="mt-8 space-y-10">
        {cards.map((card) => (
          <li key={card.id} className="rounded-lg border border-neutral-200 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-mono text-xs text-neutral-500">{card.id}</h2>
              {card.reference && (
                <p className="text-xs text-neutral-600">
                  Bonne réponse : option {card.reference.correct + 1}
                </p>
              )}
            </div>

            {card.reference && (
              <div className="sticky top-2 mt-3 rounded border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">
                  Référence française
                </p>
                <p className="mt-2 text-sm text-neutral-900">{card.reference.question}</p>
                <p className="mt-1 text-sm text-neutral-700">
                  <span className="font-bold">Correcte :</span>{' '}
                  {card.reference.options[card.reference.correct]}
                </p>
              </div>
            )}

            {card.missingLocales.length > 0 && (
              <p className="mt-3 text-xs text-neutral-500">
                Pas de version{' '}
                {card.missingLocales.map((l) => LOCALE_LABEL[l]).join(', ')}.
              </p>
            )}

            {Object.values(card.blocks).map((block) => {
              const b = block as QuestionBlock;
              const key = `${b.locale}:${card.id}`;
              const decision = decisions[key];
              return (
                <div
                  key={key}
                  role="group"
                  aria-labelledby={`${key}-label`}
                  className="mt-4 border-t border-neutral-200 pt-4"
                >
                  <p id={`${key}-label`} className="text-xs font-semibold text-neutral-600">
                    {LOCALE_LABEL[b.locale]}
                  </p>

                  {b.previous && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Relue le {b.previous.reviewedAt} ({b.previous.status})
                      {b.previous.note ? ` — ${b.previous.note}` : ''}
                    </p>
                  )}

                  <p className="mt-2 text-sm text-neutral-900">{b.question}</p>
                  <p className="mt-1 text-sm text-neutral-700">
                    <span className="font-bold">Correcte :</span> {b.options[b.correct]}
                  </p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-neutral-600">
                      Autres options et explication
                    </summary>
                    <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
                      {b.options.map((o, i) =>
                        i === b.correct ? null : <li key={o}>{o}</li>,
                      )}
                    </ul>
                    <p className="mt-2 text-sm text-neutral-600">{b.explanation}</p>
                  </details>

                  {decision ? (
                    <p className="mt-3 text-sm text-neutral-800">
                      {decision.status === 'approved' ? 'Approuvée' : 'À retirer du quiz'}{' '}
                      <button
                        type="button"
                        onClick={() => undo(key)}
                        className="text-brand-700 underline-offset-4 hover:underline"
                      >
                        annuler
                      </button>
                    </p>
                  ) : removing === key ? (
                    <div className="mt-3">
                      <label htmlFor={`${key}-note`} className="block text-xs text-neutral-700">
                        Pourquoi la retirer ?
                      </label>
                      <textarea
                        id={`${key}-note`}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={1000}
                        rows={2}
                        className="mt-1 w-full rounded border border-neutral-300 p-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        Cette note sera commitée dans le dépôt public.
                      </p>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            decide(card, b.locale, 'rejected', note);
                            setRemoving(null);
                            setNote('');
                          }}
                          className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white"
                        >
                          Confirmer le retrait
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRemoving(null);
                            setNote('');
                          }}
                          className="text-sm text-neutral-700 underline-offset-4 hover:underline"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => decide(card, b.locale, 'approved')}
                        aria-label={`Approuver, ${LOCALE_LABEL[b.locale]}, ${card.id}`}
                        className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900"
                      >
                        Approuver
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoving(key)}
                        aria-label={`Retirer du quiz, ${LOCALE_LABEL[b.locale]}, ${card.id}`}
                        className="rounded border border-status-delayed px-3 py-1.5 text-sm text-neutral-900"
                      >
                        Retirer du quiz
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {Object.keys(card.blocks).length > 1 && (
              <button
                type="button"
                onClick={() =>
                  Object.keys(card.blocks).forEach((l) => decide(card, l, 'approved'))
                }
                className="mt-4 text-sm text-brand-700 underline-offset-4 hover:underline"
              >
                Approuver les {Object.keys(card.blocks).length} langues
              </button>
            )}
          </li>
        ))}
      </ol>

      <p aria-live="polite" className="sr-only">
        {taken.length} décision(s) prise(s), {totalBlocks - taken.length} restante(s).
      </p>

      {mounted && taken.length > 0 &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-300 bg-white p-4">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
              <p className="text-sm text-neutral-700">
                {totalBlocks - taken.length} restantes · {approved} approuvées ·{' '}
                {rejected} retirées
              </p>
              <button
                type="button"
                onClick={send}
                disabled={sending || sessionOpen}
                className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {sending ? 'Enregistrement…' : `Enregistrer (${taken.length})`}
              </button>
            </div>
            {error && (
              <p role="alert" className="mx-auto mt-2 max-w-3xl text-sm text-status-delayed">
                {error}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
