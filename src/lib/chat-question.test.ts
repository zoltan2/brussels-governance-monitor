// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { currentQuestion, QUESTION_LOG_MAX_LENGTH } from './chat-question';

describe('currentQuestion', () => {
  it('retourne la question du premier tour', () => {
    expect(currentQuestion([{ role: 'user', content: 'Q1' }])).toBe('Q1');
  });

  it('retourne la question du tour en cours, pas celle du fil', () => {
    const conversation = [
      { role: 'user' as const, content: 'Y a-t-il des enquêtes pour corruption ?' },
      { role: 'assistant' as const, content: 'Réponse 1' },
      { role: 'user' as const, content: 'Et pour les marchés publics ?' },
    ];
    expect(currentQuestion(conversation)).toBe('Et pour les marchés publics ?');
  });

  it('ignore un message assistant en fin de fil', () => {
    const conversation = [
      { role: 'user' as const, content: 'Q1' },
      { role: 'assistant' as const, content: 'A1' },
      { role: 'user' as const, content: 'Q2' },
      { role: 'assistant' as const, content: '' },
    ];
    expect(currentQuestion(conversation)).toBe('Q2');
  });

  it('tronque à la longueur de log', () => {
    const long = 'a'.repeat(500);
    expect(currentQuestion([{ role: 'user', content: long }])).toHaveLength(
      QUESTION_LOG_MAX_LENGTH,
    );
  });

  it('retourne une chaîne vide sans message user', () => {
    expect(currentQuestion([{ role: 'assistant', content: 'A' }])).toBe('');
  });
});
