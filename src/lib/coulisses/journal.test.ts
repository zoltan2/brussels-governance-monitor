// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, beforeEach } from 'vitest';

process.env.DB_PATH = ':memory:';
const { getDb } = await import('@/lib/db');
const J = await import('./journal');
const db = getDb()!;

const T = {
  fr: { objet: 'Bonjour', corps: 'Texte fr' },
  nl: { objet: 'Hallo', corps: 'Tekst nl' },
  en: { objet: 'Hello', corps: 'Text en' },
};

beforeEach(() => {
  db.exec('DELETE FROM coulisses_numeros; DELETE FROM coulisses_envois;');
});

describe('journal des coulisses', () => {
  it("refuse le verrou sans essai, puis l'accorde une seule fois", () => {
    J.enregistrerTextes(db, 1, T);
    expect(J.prendreVerrou(db, 1)).toBe(false);
    J.noterEssai(db, 1, J.empreinteTextes(T));
    expect(J.prendreVerrou(db, 1)).toBe(true);
    expect(J.prendreVerrou(db, 1)).toBe(false);
  });

  it("un texte modifié après l'essai périme l'essai", () => {
    J.enregistrerTextes(db, 1, T);
    J.noterEssai(db, 1, J.empreinteTextes(T));
    J.enregistrerTextes(db, 1, { ...T, nl: { objet: 'Hallo', corps: 'Tekst nl, verbeterd' } });
    expect(J.prendreVerrou(db, 1)).toBe(false);
  });

  it("refuse de modifier le texte une fois l'envoi commencé", () => {
    J.enregistrerTextes(db, 1, T);
    J.noterEssai(db, 1, J.empreinteTextes(T));
    J.prendreVerrou(db, 1);
    expect(J.enregistrerTextes(db, 1, T)).toBe('verrouille');
  });

  it('une réservation ne se prend qu’une fois', () => {
    const d = { id: 'c1', langue: 'fr' as const, variante: 'premier' as const };
    expect(J.reserver(db, 1, d)).toBe(true);
    expect(J.reserver(db, 1, d)).toBe(false);
  });

  it('un refus explicite libère la réservation, une issue inconnue la garde', () => {
    J.reserver(db, 1, { id: 'a', langue: 'fr', variante: 'premier' });
    J.reserver(db, 1, { id: 'b', langue: 'fr', variante: 'premier' });
    J.annulerReservation(db, 1, 'a');
    J.marquerIncertain(db, 1, 'b');
    expect(J.dejaAuJournal(db, 1)).toEqual(new Set(['b']));
    expect(J.compterJournal(db, 1)).toEqual({ incertain: 1 });
  });

  it('la variante courante vient des seuls envois réussis des numéros antérieurs', () => {
    J.reserver(db, 1, { id: 'a', langue: 'fr', variante: 'premier' });
    J.marquerEnvoye(db, 1, 'a', 'em_1');
    J.reserver(db, 1, { id: 'b', langue: 'fr', variante: 'premier' });
    J.marquerIncertain(db, 1, 'b');
    expect(J.ontDejaRecu(db, 2)).toEqual(new Set(['a']));
    expect(J.ontDejaRecu(db, 1)).toEqual(new Set());
  });

  it('une reprise après interruption reprend le verrou', () => {
    J.enregistrerTextes(db, 1, T);
    J.noterEssai(db, 1, J.empreinteTextes(T));
    J.prendreVerrou(db, 1);
    J.terminer(db, 1, 'interrompu', {});
    expect(J.prendreVerrou(db, 1)).toBe(true);
    J.terminer(db, 1, 'envoye', {});
    expect(J.prendreVerrou(db, 1)).toBe(false);
  });

  it('débloque un envoi coupé après 10 minutes, pas avant', () => {
    J.enregistrerTextes(db, 1, T);
    J.noterEssai(db, 1, J.empreinteTextes(T));
    J.prendreVerrou(db, 1, 1_000_000);
    J.reserver(db, 1, { id: 'a', langue: 'fr', variante: 'premier' });
    expect(J.debloquer(db, 1, 1_000_000 + 5 * 60_000)).toBe(false);
    expect(J.debloquer(db, 1, 1_000_000 + 11 * 60_000)).toBe(true);
    expect(J.lireNumero(db, 1)!.etat).toBe('interrompu');
    expect(J.compterJournal(db, 1)).toEqual({ incertain: 1 });
  });

  it('textes incomplets détectés', () => {
    expect(J.textesComplets(T)).toBe(true);
    expect(J.textesComplets({ ...T, en: { objet: ' ', corps: 'x' } })).toBe(false);
  });
});
