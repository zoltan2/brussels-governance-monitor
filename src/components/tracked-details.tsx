// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import type { DetailsHTMLAttributes } from 'react';
import { track } from '@/lib/analytics';

/**
 * `<details>` qui envoie un événement Umami à chaque ouverture ou fermeture, avec
 * `etat` (`ouvert` | `ferme`) en propriété.
 *
 * Ouvrir un bloc repliable ne navigue nulle part : pas de lien à annoter, donc
 * `track()` (voir src/lib/analytics.ts). Sans `event`, c'est un `<details>`
 * ordinaire, qui ne mesure rien.
 *
 * ⚠️ Un `<details open>` émet `toggle` dès son premier rendu : un bloc ouvert par
 * défaut compterait une « ouverture » par vue. À réserver aux blocs fermés au
 * départ, ou à laisser sans `event`.
 */
export function TrackedDetails({
  event,
  children,
  ...rest
}: DetailsHTMLAttributes<HTMLDetailsElement> & { event?: string }) {
  return (
    <details
      {...rest}
      onToggle={
        event
          ? (e) => track(event, { etat: e.currentTarget.open ? 'ouvert' : 'ferme' })
          : undefined
      }
    >
      {children}
    </details>
  );
}
