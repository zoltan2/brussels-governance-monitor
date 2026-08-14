// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Listes fermées et matrice de permissions — déclarées UNE SEULE FOIS.
 * Les types TypeScript et les CHECK SQL des migrations en dérivent : une valeur
 * ajoutée ici et nulle part ailleurs resterait rejetée par la base, ce qui est
 * exactement le comportement voulu (spec §6).
 */

export const ROLES = [
  'SUPER_ADMIN',
  'CURATOR',
  'EDITOR',
  'OPERATIONS',
  'FINANCE',
  'ANALYST',
] as const;
export type Role = (typeof ROLES)[number];

export const OPERATIONS = [
  'artists.read',
  'artists.write',
  'artists.status_change',
  'scores.read',
  'scores.create',
  'works.write',
  'works.publish',
  'works.archive',
  'collections.write',
  'collections.publish',
  'collections.archive',
  'media.upload',
  'media.read_private',
  'media.delete',
  'people.erase',
  'audit.read',
  'users.manage',
] as const;
export type Operation = (typeof OPERATIONS)[number];

/** Spec §7.1. Toute opération absente est refusée : il n'y a pas de défaut
 * permissif, et une opération oubliée se voit en test, pas en production. */
export const PERMISSIONS: Record<Operation, readonly Role[]> = {
  'artists.read': ['SUPER_ADMIN', 'CURATOR', 'EDITOR', 'OPERATIONS', 'FINANCE', 'ANALYST'],
  'artists.write': ['SUPER_ADMIN', 'CURATOR'],
  'artists.status_change': ['SUPER_ADMIN', 'CURATOR', 'OPERATIONS'],
  'scores.read': ['SUPER_ADMIN', 'CURATOR'],
  'scores.create': ['SUPER_ADMIN', 'CURATOR'],
  'works.write': ['SUPER_ADMIN', 'CURATOR', 'EDITOR'],
  'works.publish': ['SUPER_ADMIN', 'EDITOR'],
  'works.archive': ['SUPER_ADMIN', 'CURATOR', 'EDITOR'],
  'collections.write': ['SUPER_ADMIN', 'CURATOR', 'EDITOR'],
  'collections.publish': ['SUPER_ADMIN', 'EDITOR'],
  'collections.archive': ['SUPER_ADMIN', 'EDITOR'],
  'media.upload': ['SUPER_ADMIN', 'CURATOR', 'EDITOR'],
  'media.read_private': ['SUPER_ADMIN', 'CURATOR', 'OPERATIONS'],
  // EDITOR n'a pas media.read_private : sa suppression est restreinte à ses
  // propres téléversements non privés, contrôle porté par le repository (R26).
  'media.delete': ['SUPER_ADMIN', 'CURATOR', 'EDITOR'],
  'people.erase': ['SUPER_ADMIN'],
  'audit.read': ['SUPER_ADMIN'],
  'users.manage': ['SUPER_ADMIN'],
} as const;

export function can(roles: readonly Role[], op: Operation): boolean {
  const allowed = PERMISSIONS[op];
  if (!allowed) return false; // opération inconnue : refus
  return roles.some((r) => allowed.includes(r));
}

/**
 * Visibilité par CHAMP (spec §7.1, R35). Le filtrage ne s'arrête pas à la
 * ligne : un ANALYST a `artists.read` mais ne doit jamais voir ces colonnes.
 *
 * Déclaré ici, explicitement, et jamais déduit d'une opération : faire dépendre
 * la visibilité de `artists.write` donnerait le bon résultat aujourd'hui par
 * coïncidence, et ouvrirait une fuite le jour où cette opération changerait de
 * périmètre.
 */
export const RESTRICTED_FIELDS: Record<string, readonly Role[]> = {
  internal_notes: ['SUPER_ADMIN', 'CURATOR'],
  // Sprint 4 : minimum_price n'est lisible que par SUPER_ADMIN et FINANCE (§25).
  minimum_price: ['SUPER_ADMIN', 'FINANCE'],
} as const;

/** Champs dont la VALEUR ne doit jamais entrer dans un diff d'audit (R14).
 * Le nom du champ est journalisé, sa valeur remplacée par un marqueur. */
export const PERSONAL_FIELDS: ReadonlySet<string> = new Set([
  'email',
  'legal_name',
  'display_name',
  'phone',
  'address',
  'address_line1',
  'address_line2',
  'postal_code',
  'city',
  'country',
  'iban',
  'vat_number',
  'internal_notes',
]);

export const CRM_STATUSES = [
  'discovered', 'researching', 'qualified', 'shortlisted', 'contacted',
  'responded', 'meeting_scheduled', 'negotiating', 'agreed', 'onboarding',
  'active', 'paused', 'declined', 'rejected', 'unreachable', 'withdrawn',
  'alumni', 'blacklisted', 'archived',
] as const;
export type CrmStatus = (typeof CRM_STATUSES)[number];

export const WORK_TYPES = [
  'PAINTING', 'DRAWING', 'PRINT', 'PHOTOGRAPH', 'SCULPTURE', 'INSTALLATION',
  'TEXTILE', 'CERAMIC', 'MIXED_MEDIA', 'DIGITAL', 'VIDEO', 'SOUND', 'MUSIC',
  'TEXT', 'PERFORMANCE',
] as const;
export type WorkType = (typeof WORK_TYPES)[number];
