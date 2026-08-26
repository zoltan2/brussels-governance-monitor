// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Extraction de la question à journaliser pour un appel du chat.
 *
 * Le widget renvoie tout l'historique de la conversation à chaque tour. La
 * question du tour en cours est donc le DERNIER message `user`, jamais le
 * premier : prendre le premier reloguait la question d'ouverture à chaque
 * tour, ce qui produisait des doublons dans la télémétrie admin.
 */

export const QUESTION_LOG_MAX_LENGTH = 200;

type ChatRole = 'user' | 'assistant';

/**
 * Retourne le dernier message `user` de la conversation, tronqué pour le log.
 * Retourne une chaîne vide si aucun message `user` n'est présent.
 */
export function currentQuestion(
  messages: readonly { role: ChatRole; content: string }[],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content.slice(0, QUESTION_LOG_MAX_LENGTH);
    }
  }
  return '';
}
