// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';
import { track, type NavigationZone } from '@/lib/analytics';

type NavLinkProps = ComponentProps<typeof Link> & { zone: NavigationZone };

/** Chemin interne de destination, sans langue : `/domains`, `/dossiers/[slug]`. */
function cibleDe(href: NavLinkProps['href']): string {
  return typeof href === 'string' ? href : String(href.pathname ?? '');
}

/**
 * Lien de la navigation commune (en-tête, menu, pied de page), mesuré par
 * l'événement unique `navigation-clic`, avec `zone` et `cible` en propriétés.
 *
 * Pourquoi `track()` et pas l'attribut `data-umami-event`, contrairement à la
 * règle des liens (src/lib/analytics.ts) : sur un `<a>` annoté, le traceur servi
 * appelle `preventDefault()`, ATTEND la réponse de son envoi, puis fait
 * `location.href = …`. Le `Link` de Next voit `defaultPrevented` et renonce à la
 * navigation côté client : chaque clic devient un rechargement complet, retardé
 * d'un aller-retour réseau. Acceptable pour un bloc de l'accueil, pas pour
 * l'en-tête et le pied de page de TOUTES les pages. `track()` part en
 * `keepalive` et laisse la navigation client intacte.
 *
 * Avant le 28/09/2026, environ un quart des sorties de l'accueil passaient par
 * ces liens sans être mesurées.
 */
export function NavLink({ zone, onClick, ...props }: NavLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track('navigation-clic', { zone, cible: cibleDe(props.href) });
        onClick?.(e);
      }}
    />
  );
}
