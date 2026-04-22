// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * The 4 suggested questions shown in the chat widget when it opens empty.
 * Single source of truth — imported by both the widget (to render the
 * buttons) and the pre-generation script (to build the cached answers).
 *
 * When updating these strings:
 * 1. Edit this file
 * 2. Run `npm run chat:generate-suggested` to regenerate cached answers
 * 3. Commit both files
 */
export const CHAT_SUGGESTIONS: Record<string, string[]> = {
  fr: [
    'Quels engagements de la DPR ont été vérifiés ?',
    'Comment BGM évalue un fait institutionnel ?',
    'Que surveille BGM concrètement ?',
    'Quels dossiers ont évolué ces dernières semaines à Bruxelles ?',
  ],
  nl: [
    'Welke DPR-engagementen zijn geverifieerd?',
    'Hoe beoordeelt BGM een institutioneel feit?',
    'Wat volgt BGM concreet?',
    'Welke Brusselse dossiers zijn recent veranderd?',
  ],
  en: [
    'Which regional government commitments have been verified?',
    'How does BGM assess an institutional fact?',
    'What does BGM concretely monitor?',
    'Which Brussels dossiers have evolved recently?',
  ],
  de: [
    'Welche regionalen Regierungsverpflichtungen wurden geprüft?',
    'Wie bewertet BGM eine institutionelle Tatsache?',
    'Was überwacht BGM konkret?',
    'Welche Brüsseler Dossiers haben sich zuletzt entwickelt?',
  ],
};

export const CHAT_TIERS = ['free', 'paid'] as const;
export type ChatTier = (typeof CHAT_TIERS)[number];
