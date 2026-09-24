// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Listes de thèmes d'abonnement statiques. Module PUR, sans import : il est
// lu par le formulaire des préférences (`'use client'`). Ne jamais y importer
// `@/lib/content` ni `@/lib/resend`, sous peine d'embarquer tout le contenu
// Velite dans le bundle client (≈ 19 Mo jusqu'au 24/09/2026). Les thèmes de
// dossier, dérivés du contenu, se calculent côté serveur (`getDossierTopics`
// dans `@/lib/resend`, `getAllDossierTopicOptions` dans `@/lib/content`).
// Garde : `src/components/client-bundle-boundary.test.ts`.

export const DOMAIN_TOPICS = [
  'budget',
  'mobility',
  'employment',
  'housing',
  'climate',
  'social',
  'solutions',
  'security',
  'economy',
  'cleanliness',
  'institutional',
  'urban-planning',
  'digital',
  'education',
] as const;

export const SECTOR_TOPICS = [
  'commerce',
  'construction',
  'culture',
  'digital',
  'education',
  'environment',
  'health-social',
  'horeca',
  'housing-sector',
  'nonprofit',
  'transport',
] as const;

export const COMMUNE_TOPICS = [
  'communes',
  'commune-anderlecht',
  'commune-auderghem',
  'commune-berchem-sainte-agathe',
  'commune-bruxelles-ville',
  'commune-etterbeek',
  'commune-evere',
  'commune-forest',
  'commune-ganshoren',
  'commune-ixelles',
  'commune-jette',
  'commune-koekelberg',
  'commune-molenbeek-saint-jean',
  'commune-saint-gilles',
  'commune-saint-josse-ten-noode',
  'commune-schaerbeek',
  'commune-uccle',
  'commune-watermael-boitsfort',
  'commune-woluwe-saint-lambert',
  'commune-woluwe-saint-pierre',
] as const;

export const ENGAGEMENT_TOPICS = ['engagements'] as const;
