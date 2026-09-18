// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Vignettes de statut : une apparence unique pour tout le site.
 *
 * Avant ce module, huit tables « statut → classes » vivaient recopiées dans huit
 * fichiers, avec quatre apparences différentes : contour (4 copies identiques),
 * aplat (2 copies identiques), et deux tables teintées qui employaient des
 * couleurs hors palette (indigo, slate, orange, amber-50, teal-50). La page
 * d'accueil affichait les deux premières côte à côte, sur des cartes par ailleurs
 * jumelles : le lecteur n'y lisait aucune distinction, seulement une incohérence.
 *
 * Le contour l'emporte parce qu'il reste lisible quand le statut ne distingue
 * rien : huit « En cours » d'affilée en aplat produisent une colonne de pavés
 * colorés qui passent devant les titres qu'ils étaient censés qualifier.
 *
 * Les VOCABULAIRES restent distincts — un domaine, un dossier et un engagement
 * ne décrivent pas la même chose — mais chacun déclare quel RÔLE de couleur porte
 * chacune de ses valeurs, et le rôle seul décide de l'apparence.
 */

import type { DomainCard, DossierCard } from '@/lib/content';
import type { CommitmentStatus } from '@/lib/commitment-status';
import { cn } from '@/lib/utils';

/** Le rôle décide de la couleur ; le vocabulaire décide du rôle. */
export type BadgeRole = 'ongoing' | 'resolved' | 'blocked' | 'delayed' | 'brand' | 'neutral';

/** Reprises telles quelles des sites d'appel existants, pour ne pas aplatir la
 *  hiérarchie voulue : `lg` sur un titre de page, `xs` dans une navigation dense. */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

const ROLE_CLASSES: Record<BadgeRole, string> = {
  ongoing: 'border-status-ongoing text-status-ongoing',
  resolved: 'border-status-resolved text-status-resolved',
  blocked: 'border-status-blocked text-status-blocked',
  delayed: 'border-status-delayed text-status-delayed',
  brand: 'border-brand-600 text-brand-700',
  neutral: 'border-neutral-400 text-neutral-600',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

/** `border` sans épaisseur explicite rendait le contour invisible dans
 *  domain-hub-nav : la classe est ici, une fois, pour que le cas ne se repose pas. */
const BADGE_BASE = 'shrink-0 rounded-full border font-medium';

export function statusBadgeClass(role: BadgeRole, size: BadgeSize = 'sm'): string {
  return cn(BADGE_BASE, SIZE_CLASSES[size], ROLE_CLASSES[role]);
}

// ── Vocabulaires ────────────────────────────────────────────────────────────
// Typés sur les unions réelles : ajouter une valeur au contenu sans lui donner
// de rôle ici casse la compilation, au lieu de produire une vignette sans classe.

export const DOMAIN_STATUS_ROLE: Record<DomainCard['status'], BadgeRole> = {
  blocked: 'blocked',
  delayed: 'delayed',
  ongoing: 'ongoing',
  resolved: 'resolved',
};

export const DOSSIER_PHASE_ROLE: Record<DossierCard['phase'], BadgeRole> = {
  announced: 'neutral',
  planned: 'brand',
  'in-progress': 'ongoing',
  stalled: 'blocked',
  completed: 'resolved',
  cancelled: 'neutral',
};

/** `stalled` est gris et `delayed` ambre, ici comme partout : les deux
 *  sémantiques s'étaient croisées dans domain-hub-nav, où `stalled` portait
 *  un fond ambre et un texte gris. */
export const COMMITMENT_STATUS_ROLE: Record<CommitmentStatus, BadgeRole> = {
  implemented: 'resolved',
  'in-legislation': 'ongoing',
  announced: 'brand',
  'not-started': 'neutral',
  delayed: 'delayed',
  abandoned: 'neutral',
};

export function domainBadgeClass(status: DomainCard['status'], size: BadgeSize = 'md'): string {
  return statusBadgeClass(DOMAIN_STATUS_ROLE[status], size);
}

export function dossierBadgeClass(phase: DossierCard['phase'], size: BadgeSize = 'sm'): string {
  return statusBadgeClass(DOSSIER_PHASE_ROLE[phase], size);
}

export function commitmentBadgeClass(status: CommitmentStatus, size: BadgeSize = 'xs'): string {
  return statusBadgeClass(COMMITMENT_STATUS_ROLE[status], size);
}
