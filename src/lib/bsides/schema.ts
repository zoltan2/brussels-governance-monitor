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
  'first_name',
  'last_name',
  // `legal_name` n'existe plus en base depuis l'alignement sur le §6.1
  // (first_name / last_name). Le nom reste dans l'ensemble : masquer un champ
  // disparu ne coûte rien, l'oublier après une réintroduction coûterait une
  // fuite dans le journal d'audit.
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

/**
 * Statuts CRM — spec §6.2, verbatim, MAJUSCULES comprises.
 *
 * Une version antérieure en avait inventé dix-neuf autres en minuscules
 * (`discovered`, `researching`, `qualified`…). Le compte tombait juste, les
 * valeurs non : c'est le genre d'écart qu'un résumé produit et qu'un test de
 * cardinalité ne voit pas. La casse fait partie de la valeur.
 */
export const CRM_STATUSES = [
  'FOUND', 'REVIEW_PENDING', 'REVIEWED', 'SCORED', 'SHORTLISTED',
  'CONTACT_READY', 'CONTACTED', 'FOLLOWUP_1', 'FOLLOWUP_2', 'RESPONDED',
  'INTERESTED', 'MEETING', 'SELECTED', 'ONBOARDING', 'ACTIVE', 'AMBASSADOR',
  'NOT_NOW', 'DECLINED', 'ARCHIVED',
] as const;
export type CrmStatus = (typeof CRM_STATUSES)[number];

/** Types d'œuvre — spec §6.5, verbatim. */
export const WORK_TYPES = [
  'ILLUSTRATION', 'PAINTING', 'PHOTOGRAPHY', 'SCULPTURE', 'CERAMIC', 'PRINT',
  'DIGITAL', 'MUSIC', 'SOUND', 'TEXT', 'PERFORMANCE', 'INSTALLATION',
  'MIXED', 'OTHER',
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

/** Natures de média — spec §6.6 (« image, audio preview, video, document or
 * 360 asset »). Vaut pour les médias d'œuvre comme pour ceux de personne. */
export const MEDIA_TYPES = [
  'IMAGE', 'AUDIO_PREVIEW', 'VIDEO', 'DOCUMENT', 'ASSET_360',
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** Master conservé / variantes responsives — spec §35. Axe distinct de
 * `MEDIA_TYPES` : une version antérieure les confondait dans un seul champ. */
export const VARIANT_ROLES = ['master', 'variant'] as const;
export type VariantRole = (typeof VARIANT_ROLES)[number];
