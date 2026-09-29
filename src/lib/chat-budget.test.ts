// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDb } from './db';
import {
  MODELE_CHAT,
  ajouterDepense,
  budgetAtteint,
  coutMicroUsd,
  depenseDuJour,
  jourBruxelles,
  plafondJourMicroUsd,
} from './chat-budget';

afterEach(() => {
  delete process.env.CHAT_DAILY_BUDGET_USD;
});

describe('coutMicroUsd (tarif claude-sonnet-4-5 relevé le 29/09/2026)', () => {
  it('prix chaque type de jeton séparément', () => {
    // 1 000 000 de jetons de chaque type = 3 + 3,75 + 0,30 + 15 USD.
    const m = 1_000_000;
    expect(
      coutMicroUsd({ input_tokens: m, cache_creation_input_tokens: m, cache_read_input_tokens: m, output_tokens: m }),
    ).toBe(22_050_000);
  });

  it("une réponse typique du chat (9 000 jetons lus en cache, 300 en sortie) coûte moins d'un centime", () => {
    const c = coutMicroUsd({ input_tokens: 40, cache_read_input_tokens: 9_000, output_tokens: 300 });
    expect(c).toBe(7_320);
  });

  it('usage absent : zéro', () => {
    expect(coutMicroUsd({})).toBe(0);
  });
});

describe('plafond du jour', () => {
  it('2 USD par défaut, réglable', () => {
    expect(plafondJourMicroUsd()).toBe(2_000_000);
    process.env.CHAT_DAILY_BUDGET_USD = '0.5';
    expect(plafondJourMicroUsd()).toBe(500_000);
    process.env.CHAT_DAILY_BUDGET_USD = 'n’importe quoi';
    expect(plafondJourMicroUsd()).toBe(2_000_000);
  });

  it('cumule par jour et bloque au plafond', () => {
    const db = createDb(':memory:');
    ajouterDepense(db, '2026-09-29', 1_500_000);
    expect(budgetAtteint(db, '2026-09-29')).toBe(false);
    ajouterDepense(db, '2026-09-29', 500_000);
    expect(depenseDuJour(db, '2026-09-29')).toBe(2_000_000);
    expect(budgetAtteint(db, '2026-09-29')).toBe(true);
    expect(budgetAtteint(db, '2026-09-30')).toBe(false);
  });

  it('le jour change à minuit heure de Bruxelles, pas UTC', () => {
    expect(jourBruxelles(new Date('2026-09-29T21:59:00Z'))).toBe('2026-09-29');
    expect(jourBruxelles(new Date('2026-09-29T22:01:00Z'))).toBe('2026-09-30');
  });

  it('verrou : la route appelle le modèle dont le tarif est connu', () => {
    const route = readFileSync('src/app/api/chat/route.ts', 'utf8');
    expect(route).toContain('model: MODELE_CHAT');
    expect(route).not.toMatch(/model: '/);
    expect(MODELE_CHAT).toBe('claude-sonnet-4-5');
  });
});
