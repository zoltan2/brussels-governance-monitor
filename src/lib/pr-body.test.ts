// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { editorialPrBody } from './pr-body';

describe('editorialPrBody', () => {
  it("retire la ligne d'attribution et l'URL de session", () => {
    const body = 'Premier paragraphe.\n\nSecond.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nhttps://claude.ai/code/session_abc';
    expect(editorialPrBody(body)).toBe('Premier paragraphe.\n\nSecond.');
  });

  it('retire une URL de session seule en fin de corps', () => {
    expect(editorialPrBody('Texte.\n\nhttps://claude.ai/code/session_abc\n')).toBe('Texte.');
  });

  it('laisse intact un corps sans attribution', () => {
    expect(editorialPrBody('Veille du 10 septembre.\nDeux fiches.')).toBe('Veille du 10 septembre.\nDeux fiches.');
  });

  it('rend une chaîne vide pour un corps absent', () => {
    expect(editorialPrBody(null)).toBe('');
  });
});
