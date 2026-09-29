// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Les exemples de forme du prompt ne portent aucun fait. Jusqu'au 29/09/2026,
 * l'exemple « Le BGM a vérifié 6 des 16 engagements de la DPR bruxelloise,
 * dont 2 tenus et 4 en retard » a été recopié tel quel dans les réponses
 * préparées du chatbot, alors que data/commitments.json n'a jamais compté
 * deux engagements tenus (aucun le 29/09).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('./content', () => ({ getDossierCards: () => [] }));
vi.mock('./radar', () => ({ getActiveSourceCount: () => 237 }));

const { BGM_PREAMBLE } = await import('./chat-system-prompt');

/** Texte des exemples : ce qui suit « Forme attendue », « forme : », « ex: » ou « Exemple », jusqu'à la fin de la ligne. */
function exemples(prompt: string): string[] {
  return [...prompt.matchAll(/(?:Forme attendue|forme :|ex ?:|Exemple)[^\n]*/gi)].map((m) => m[0]);
}

describe('exemples du prompt du chatbot', () => {
  it('témoin : les exemples sont bien trouvés', () => {
    expect(exemples(BGM_PREAMBLE).length).toBeGreaterThanOrEqual(2);
  });

  it('aucun exemple ne contient de chiffre (un chiffre d’exemple finit recopié comme un fait)', () => {
    for (const e of exemples(BGM_PREAMBLE)) expect(e, e).not.toMatch(/\d/);
  });

  it('interdit tout chiffre absent du contexte fourni', () => {
    expect(BGM_PREAMBLE).toContain("N'écris AUCUN chiffre, aucune date et aucun décompte qui ne figure pas mot pour mot dans le contexte fourni.");
  });
});
