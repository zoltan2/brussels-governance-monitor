// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { createDb } from './db';
import {
  REVERIFICATION_MS,
  enregistrerDeblocage,
  etatPaiement,
  noterVerification,
  sessionRemboursee,
} from './chat-paiements';

describe('registre des paiements du chatbot', () => {
  it("une session n'ouvre l'accès qu'une fois", () => {
    const db = createDb(':memory:');
    expect(enregistrerDeblocage(db, 'cs_a', 1000)).toBe(true);
    expect(enregistrerDeblocage(db, 'cs_a', 2000)).toBe(false);
    expect(enregistrerDeblocage(db, 'cs_b', 2000)).toBe(true);
  });

  it('revérification au plus une fois par jour, remboursement retenu', () => {
    const db = createDb(':memory:');
    enregistrerDeblocage(db, 'cs_a', 0);
    expect(etatPaiement(db, 'cs_a', REVERIFICATION_MS - 1)).toEqual({ rembourse: false, aReverifier: false });
    expect(etatPaiement(db, 'cs_a', REVERIFICATION_MS)).toEqual({ rembourse: false, aReverifier: true });
    noterVerification(db, 'cs_a', REVERIFICATION_MS, true);
    expect(etatPaiement(db, 'cs_a', REVERIFICATION_MS + 1)).toEqual({ rembourse: true, aReverifier: false });
    expect(etatPaiement(db, 'cs_inconnue', 0)).toBeNull();
  });

  it('remboursement lu sur la dernière charge, même partiel', () => {
    expect(sessionRemboursee({ payment_intent: { latest_charge: { refunded: true } } })).toBe(true);
    expect(sessionRemboursee({ payment_intent: { latest_charge: { refunded: false, amount_refunded: 100 } } })).toBe(true);
    expect(sessionRemboursee({ payment_intent: { latest_charge: { refunded: false, amount_refunded: 0 } } })).toBe(false);
    // Non étendu (identifiant seul) : rien à lire, pas de remboursement supposé.
    expect(sessionRemboursee({ payment_intent: 'pi_123' })).toBe(false);
    expect(sessionRemboursee({})).toBe(false);
  });
});
