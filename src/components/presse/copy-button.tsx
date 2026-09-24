// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';
import { track } from '@/lib/analytics';

/**
 * Copie le texte VISIBLE d'un élément de la page (`targetId`) : ce qui est copié
 * est exactement ce qui est lu, sans seconde chaîne à tenir à jour.
 *
 * Trois issues, toutes annoncées par la région `role="status"` :
 *   - le presse-papiers accepte : « copié », et l'événement Umami part ;
 *   - l'API manque (contexte non sécurisé, navigateur ancien) ou refuse
 *     (permission) : le texte est SÉLECTIONNÉ et le message invite à copier au
 *     clavier. On n'annonce jamais un succès qui n'a pas eu lieu.
 *
 * L'événement ne porte que son nom et, au besoin, un slug : jamais le texte.
 * Aucun appel tiers : `navigator.clipboard` est une API du navigateur.
 *
 * Les libellés arrivent en propriétés, traduits par la page serveur : ce
 * composant n'ajoute aucun espace de noms au dictionnaire envoyé au navigateur.
 */
export interface CopyButtonProps {
  targetId: string;
  label: string;
  copiedMessage: string;
  selectedMessage: string;
  event: string;
  eventData?: Record<string, string>;
}

type Etat = 'repos' | 'copie' | 'selection';

function selectionner(el: HTMLElement) {
  const selection = window.getSelection?.();
  if (!selection) return;
  const plage = document.createRange();
  plage.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(plage);
}

export function CopyButton({ targetId, label, copiedMessage, selectedMessage, event, eventData }: CopyButtonProps) {
  const [etat, setEtat] = useState<Etat>('repos');

  async function copier() {
    const cible = document.getElementById(targetId);
    if (!cible) return;
    // Vider d'abord : un second clic doit être annoncé à nouveau.
    setEtat('repos');
    const texte = (cible.textContent ?? '').replace(/\s+/g, ' ').trim();
    const pressePapiers = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (pressePapiers && typeof pressePapiers.writeText === 'function') {
      try {
        await pressePapiers.writeText(texte);
        setEtat('copie');
        track(event, eventData);
        return;
      } catch {
        // Permission refusée ou document sans focus : repli ci-dessous.
      }
    }
    selectionner(cible);
    setEtat('selection');
  }

  const message = etat === 'copie' ? copiedMessage : etat === 'selection' ? selectedMessage : '';

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button
        type="button"
        onClick={copier}
        aria-controls={targetId}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-brand-700 px-3 py-1.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-900 hover:text-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"
          />
        </svg>
        {label}
      </button>
      <p role="status" aria-live="polite" className="text-xs text-neutral-600">
        {message}
      </p>
    </div>
  );
}
