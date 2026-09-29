// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/** Niveaux d'accès du chatbot. Les questions suggérées ont été retirées le 29/09/2026. */
export const CHAT_TIERS = ['free', 'paid'] as const;
export type ChatTier = (typeof CHAT_TIERS)[number];
