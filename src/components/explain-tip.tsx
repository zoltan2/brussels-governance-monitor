// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useId, useState } from 'react';

interface ExplainTipProps {
  /** Nom accessible du bouton (« Que signifie cette date ? »). */
  label: string;
  /** Explication courte, lue par les lecteurs d'écran via aria-describedby. */
  text: string;
}

/**
 * Petite explication en surimpression, ouverte au survol, au focus clavier ET
 * au toucher (clic), refermée par Échap ou en quittant. Positionnée en absolu :
 * elle ne pousse pas le contenu de l'en-tête. Les chaînes arrivent traduites
 * par le composant serveur parent : les espaces de noms envoyés au client
 * sont verrouillés (src/i18n/client-namespaces.test.ts).
 */
export function ExplainTip({ label, text }: ExplainTipProps) {
  const id = useId();
  const [ouvert, setOuvert] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOuvert(true)}
      onMouseLeave={() => setOuvert(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOuvert(false);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] leading-none font-semibold focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <span aria-hidden="true">?</span>
      </button>
      <span
        id={id}
        role="tooltip"
        className={`absolute top-full left-1/2 z-20 mt-2 w-64 -translate-x-1/2 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-xs leading-relaxed font-normal text-neutral-700 shadow-md ${ouvert ? 'block' : 'hidden'}`}
      >
        {text}
      </span>
    </span>
  );
}
