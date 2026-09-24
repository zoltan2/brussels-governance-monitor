// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import {
  ajouterJours,
  aujourdhuiBruxelles,
  bilanEcheances,
  estEnRetard,
  estJourISO,
  joursDeRetard,
  type EntreeFiche,
  type EntreeVerification,
} from './verification-due';

/**
 * Aucune horloge réelle ici : « aujourd'hui » est toujours passé en
 * paramètre, pour que ces tests disent la même chose le 24/09/2026 et dans
 * trois ans.
 */
const AUJOURDHUI = '2026-09-24';

function verif(o: Partial<EntreeVerification> = {}): EntreeVerification {
  return {
    fichier: 'content/verifications/budget-2026-03-06.fr.mdx',
    cardType: 'domain',
    cardSlug: 'budget',
    locale: 'fr',
    date: '2026-03-06',
    nextVerification: '2026-04-06',
    ...o,
  };
}

function fiche(o: Partial<EntreeFiche> = {}): EntreeFiche {
  return {
    fichier: 'content/dossiers/lez.fr.mdx',
    collection: 'dossier',
    slug: 'lez',
    locale: 'fr',
    lastVerified: undefined,
    verificationIntervalDays: undefined,
    ...o,
  };
}

describe('comparaison à la date du jour', () => {
  it("n'est pas en retard le jour même de l'échéance, l'est dès le lendemain", () => {
    expect(joursDeRetard('2026-09-24', AUJOURDHUI)).toBe(0);
    expect(estEnRetard('2026-09-24', AUJOURDHUI)).toBe(false);
    expect(estEnRetard('2026-09-23', AUJOURDHUI)).toBe(true);
    expect(joursDeRetard('2026-09-23', AUJOURDHUI)).toBe(1);
    expect(estEnRetard('2026-09-25', AUJOURDHUI)).toBe(false);
  });

  it('compte les jours sans glisser au changement d’heure (29/03 et 25/10 à Bruxelles)', () => {
    expect(joursDeRetard('2026-03-28', '2026-03-30')).toBe(2);
    expect(joursDeRetard('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('ajoute un intervalle en jours calendaires, fin de mois comprise', () => {
    expect(ajouterJours('2026-06-01', 90)).toBe('2026-08-30');
    expect(ajouterJours('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('prend le jour calendaire de Bruxelles, pas celui de UTC', () => {
    // 23 h 30 UTC le 24/09 = 1 h 30 le 25/09 à Bruxelles (UTC+2).
    expect(aujourdhuiBruxelles(new Date('2026-09-24T23:30:00Z'))).toBe('2026-09-25');
  });
});

describe('estJourISO', () => {
  it('accepte un vrai jour, refuse un horodatage, un format local et un jour inexistant', () => {
    expect(estJourISO('2026-09-20')).toBe(true);
    expect(estJourISO('2026-09-20T00:00:00.000Z')).toBe(false);
    expect(estJourISO('20/09/2026')).toBe(false);
    expect(estJourISO('2026-02-30')).toBe(false);
    expect(estJourISO(undefined)).toBe(false);
  });
});

describe('bilanEcheances : registre des vérifications', () => {
  it('signale la dernière vérification dont l’échéance est dépassée, avec ses jours de retard', () => {
    const b = bilanEcheances({ verifications: [verif()], fiches: [], aujourdhui: AUJOURDHUI });
    expect(b.verificationsEnRetard).toHaveLength(1);
    expect(b.verificationsEnRetard[0]).toMatchObject({ cardSlug: 'budget', echeance: '2026-04-06', joursDeRetard: 171 });
    expect(b.fichesVerifiees).toBe(1);
    expect(b.verificationsAvecEcheance).toBe(1);
  });

  it("registre : pas en retard le jour de l'échéance, en retard d'un jour le lendemain", () => {
    const le = (aujourdhui: string) =>
      bilanEcheances({ verifications: [verif({ nextVerification: '2026-09-24' })], fiches: [], aujourdhui });
    expect(le('2026-09-24').verificationsEnRetard).toEqual([]);
    expect(le('2026-09-25').verificationsEnRetard.map((v) => v.joursDeRetard)).toEqual([1]);
  });

  it('ne signale pas une échéance ancienne honorée par une vérification plus récente', () => {
    const b = bilanEcheances({
      verifications: [
        verif({ date: '2026-02-08', nextVerification: '2026-03-08' }),
        verif({ date: '2026-09-20', nextVerification: '2026-10-20' }),
      ],
      fiches: [],
      aujourdhui: AUJOURDHUI,
    });
    expect(b.verificationsEnRetard).toEqual([]);
    expect(b.fichesVerifiees).toBe(1);
  });

  it('compte une fiche par vérification, pas une par langue', () => {
    const b = bilanEcheances({
      verifications: ['fr', 'nl', 'en', 'de'].map((locale) => verif({ locale, fichier: `x.${locale}.mdx` })),
      fiches: [],
      aujourdhui: AUJOURDHUI,
    });
    expect(b.verificationsEnRetard).toHaveLength(1);
    expect(b.verificationsEnRetard[0].fichier).toBe('x.fr.mdx');
  });

  it('lit les horodatages Velite comme leur jour', () => {
    const b = bilanEcheances({
      verifications: [verif({ date: '2026-03-06T00:00:00.000Z', nextVerification: '2026-04-06T00:00:00.000Z' })],
      fiches: [],
      aujourdhui: AUJOURDHUI,
    });
    expect(b.verificationsEnRetard[0].echeance).toBe('2026-04-06');
    expect(b.invalides).toEqual([]);
  });

  it("n'invente pas d'échéance pour une vérification qui n'en porte pas", () => {
    const b = bilanEcheances({ verifications: [verif({ nextVerification: undefined })], fiches: [], aujourdhui: AUJOURDHUI });
    expect(b.verificationsEnRetard).toEqual([]);
    expect(b.verificationsAvecEcheance).toBe(0);
  });

  it('signale une échéance illisible au lieu de la taire', () => {
    const b = bilanEcheances({ verifications: [verif({ nextVerification: 'avril' })], fiches: [], aujourdhui: AUJOURDHUI });
    expect(b.invalides).toHaveLength(1);
    expect(b.invalides[0].champ).toBe('nextVerification');
  });
});

describe('bilanEcheances : lastVerified des dossiers et domaines', () => {
  it('signale lastVerified + intervalle dépassé', () => {
    const b = bilanEcheances({
      verifications: [],
      fiches: [fiche({ lastVerified: '2026-06-01', verificationIntervalDays: '90' })],
      aujourdhui: AUJOURDHUI,
    });
    expect(b.fichesEnRetard).toHaveLength(1);
    expect(b.fichesEnRetard[0]).toMatchObject({ echeance: '2026-08-30', joursDeRetard: 25, intervalDays: 90 });
    expect(b.fichesAvecDate).toBe(1);
    expect(b.fichesAvecIntervalle).toBe(1);
  });

  it("n'est pas en retard le jour de l'échéance", () => {
    const b = bilanEcheances({
      verifications: [],
      fiches: [fiche({ lastVerified: '2026-06-26', verificationIntervalDays: 90 })],
      aujourdhui: AUJOURDHUI,
    });
    expect(ajouterJours('2026-06-26', 90)).toBe(AUJOURDHUI);
    expect(b.fichesEnRetard).toEqual([]);
  });

  it("sans intervalle, jamais d'échéance : aucune règle inventée", () => {
    const b = bilanEcheances({ verifications: [], fiches: [fiche({ lastVerified: '2020-01-01' })], aujourdhui: AUJOURDHUI });
    expect(b.fichesEnRetard).toEqual([]);
    expect(b.fichesAvecDate).toBe(1);
    expect(b.fichesAvecIntervalle).toBe(0);
  });

  it('sans lastVerified, rien : ni retard, ni compte', () => {
    const b = bilanEcheances({ verifications: [], fiches: [fiche()], aujourdhui: AUJOURDHUI });
    expect(b.fichesAvecDate).toBe(0);
    expect(b.invalides).toEqual([]);
  });

  it('refuse une date future : une vérification ne s’atteste pas d’avance', () => {
    const b = bilanEcheances({ verifications: [], fiches: [fiche({ lastVerified: '2026-09-25' })], aujourdhui: AUJOURDHUI });
    expect(b.invalides).toHaveLength(1);
    expect(b.invalides[0].motif).toMatch(/futur/);
    expect(b.fichesAvecDate).toBe(0);
  });

  it('refuse une date illisible, un intervalle nul, négatif ou décimal, un intervalle sans date', () => {
    const b = bilanEcheances({
      verifications: [],
      fiches: [
        fiche({ fichier: 'a', lastVerified: '20/09/2026' }),
        fiche({ fichier: 'b', lastVerified: '2026-09-01', verificationIntervalDays: '0' }),
        fiche({ fichier: 'c', lastVerified: '2026-09-01', verificationIntervalDays: -5 }),
        fiche({ fichier: 'd', lastVerified: '2026-09-01', verificationIntervalDays: '1.5' }),
        fiche({ fichier: 'e', verificationIntervalDays: 30 }),
      ],
      aujourdhui: AUJOURDHUI,
    });
    expect(b.invalides.map((i) => i.fichier)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('refuse de rendre un bilan sur une date du jour illisible', () => {
    expect(() => bilanEcheances({ verifications: [], fiches: [], aujourdhui: 'demain' })).toThrow(/illisible/);
  });
});
