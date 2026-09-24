// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

interface ExplainTipProps {
  /** Nom accessible du déclencheur (« Que signifie « vérifié » ? »). */
  label: string;
  /** Explication courte, révélée à l'ouverture. */
  text: string;
}

/**
 * Explication repliable, en élément de divulgation NATIF
 * (`<details>` / `<summary>`), sans JavaScript et sans `role="tooltip"`.
 *
 * Pourquoi ce motif (EAA / WCAG 2.1 AA, EN 301 549) :
 * - Il fonctionne sans script : le navigateur gère l'ouverture. L'ancienne
 *   bulle restait masquée tant que React n'était pas hydraté (4.1.2 et 2.1.1).
 * - `<summary>` est exposé comme un bouton, avec son état ouvert ou fermé
 *   (aria-expanded implicite), et s'actionne à Entrée ou Espace, au clic et
 *   au toucher (2.1.1, 4.1.2 Nom, rôle et valeur). Aucun ARIA ajouté, donc
 *   aucun ARIA à contredire : l'ancien mélange `role="tooltip"` et bouton à
 *   aria-expanded n'était pas un motif valide.
 * - Le contenu ne s'ouvre qu'à l'action de l'utilisateur, jamais au survol ni
 *   au simple focus : il ne masque rien sans qu'on l'ait demandé et reste
 *   affiché tant qu'on ne le referme pas (1.4.13 Contenu au survol ou au focus).
 * - Le nom accessible est un texte complet (lu tel quel), le « ? » visible
 *   est décoratif (1.1.1, 2.5.3 Étiquette dans le nom : le libellé visible
 *   « ? » n'a pas de mot à reprendre).
 * - Le panneau est positionné en absolu : fermé comme ouvert, il ne pousse ni
 *   ne déplace le contenu de l'en-tête (pas de décalage de mise en page).
 *
 * Composant serveur : aucune directive client, aucun état.
 * ⚑ `<details>` est un contenu de flux : son parent doit être un `<div>`,
 * jamais un `<span>`.
 */
export function ExplainTip({ label, text }: ExplainTipProps) {
  return (
    <details className="relative inline-block">
      <summary className="inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border border-current text-[10px] leading-none font-semibold focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">?</span>
        <span className="sr-only">{label}</span>
      </summary>
      <p className="absolute top-full left-1/2 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-xs leading-relaxed font-normal text-neutral-700 shadow-md">
        {text}
      </p>
    </details>
  );
}
