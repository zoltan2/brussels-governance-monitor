// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Forme de l'historique accepte par `/api/chat` (revue red team du 28/09).
 *
 * Le widget renvoie toute la conversation a chaque tour, y compris les reponses
 * de l'assistant : c'est le seul moyen de garder le fil sans session serveur.
 * La route relayait pourtant au modele n'importe quelle suite de messages, dont
 * des tours `assistant` fabriques de toutes pieces, places en tete ou enchaines,
 * pour orienter le modele hors de son prompt systeme.
 *
 * Ce que produit le widget (`src/components/chat-widget.tsx`, `send`) :
 * `[user, assistant, user, assistant, ..., user]`. Une reponse en erreur est
 * remplacee par le message d'erreur localise, toujours en role `assistant` :
 * l'alternance tient dans tous les cas. On exige donc exactement cette forme.
 *
 * Cela ne rend pas impossible un tour `assistant` invente au bon endroit : seule
 * une signature serveur de chaque reponse le ferait. Mais la place et la taille
 * de ce qu'un appelant peut glisser sont bornees.
 */

export type ChatRole = 'user' | 'assistant';
export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/**
 * Longueur maximale d'une reponse de l'assistant RELAYEE au modele. Au-dela, le
 * texte est tronque plutot que refuse : une vraie reponse longue (jusqu'a 2 048
 * jetons en sortie) ne doit pas casser le tour suivant de la conversation.
 */
export const MAX_ASSISTANT_RELAY_CHARS = 2000;

/** `null` si l'historique a la forme produite par le widget, un motif sinon. */
export function chatHistoryRefusal(messages: readonly ChatTurn[]): string | null {
  if (messages.length === 0) return 'empty';
  if (messages.length % 2 === 0) return 'must end with a user turn';
  for (let i = 0; i < messages.length; i++) {
    const attendu: ChatRole = i % 2 === 0 ? 'user' : 'assistant';
    if (messages[i].role !== attendu) return 'roles must alternate, starting with user';
  }
  return null;
}

/** Tronque les tours `assistant` avant de les relayer au modele. */
export function boundAssistantTurns(messages: readonly ChatTurn[]): ChatTurn[] {
  return messages.map((m) =>
    m.role === 'assistant' && m.content.length > MAX_ASSISTANT_RELAY_CHARS
      ? { role: m.role, content: m.content.slice(0, MAX_ASSISTANT_RELAY_CHARS) }
      : { role: m.role, content: m.content },
  );
}
