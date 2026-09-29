// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { track } from '@/lib/analytics';

type EventData = Record<string, string | number>;

/**
 * Lien interne mesuré par `track()`, SANS rechargement de page.
 *
 * Sur un `<a>` porteur de `data-umami-event`, le traceur Umami servi appelle
 * `preventDefault()`, attend la réponse de son envoi, puis fait
 * `location.href = …` (vérifié dans le traceur servi le 28/09/2026). Le `Link` de
 * Next voit `defaultPrevented` et renonce à la navigation client : chaque clic
 * mesuré de l'accueil devenait un rechargement complet, retardé d'un
 * aller-retour réseau. `track()` part en `keepalive` et laisse la navigation
 * intacte. Même principe que `NavLink` (en-tête et pied de page).
 */
export function TrackedLink({
  event,
  eventData,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { event?: string; eventData?: EventData }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        // Sans nom d'événement (lien mesuré sur certaines pages seulement) : rien n'est envoyé.
        if (event) track(event, eventData);
        onClick?.(e);
      }}
    />
  );
}

/**
 * Variante `<a>` pour les ancres de la page (`#subscribe`) et les liens hors de
 * l'application Next (digest statique, magazine) : même mesure, sans que le
 * traceur bloque le clic.
 */
export function TrackedAnchor({
  event,
  eventData,
  onClick,
  ...props
}: ComponentProps<'a'> & { event: string; eventData?: EventData }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(event, eventData);
        onClick?.(e);
      }}
    />
  );
}
