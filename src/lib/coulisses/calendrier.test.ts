// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { estJourDEnvoi, jourEnClair, moisValide, premierJeudi, prochainRendezVous } from './calendrier';

describe('calendrier des coulisses', () => {
  it('premier jeudi : novembre 2026 à février 2027 (tableau du 3 novembre), et un mois qui commence un jeudi', () => {
    expect(premierJeudi('2026-11')).toBe('2026-11-05');
    expect(premierJeudi('2026-12')).toBe('2026-12-03');
    expect(premierJeudi('2027-01')).toBe('2027-01-07');
    expect(premierJeudi('2027-02')).toBe('2027-02-04');
    expect(premierJeudi('2027-04')).toBe('2027-04-01');
  });

  it("jour d'envoi : ce jeudi-là à Bruxelles, de minuit à minuit, pas la veille ni le lendemain", () => {
    expect(estJourDEnvoi('2026-11', new Date('2026-11-04T23:30:00Z'))).toBe(true); // 0 h 30 à Bruxelles
    expect(estJourDEnvoi('2026-11', new Date('2026-11-04T22:30:00Z'))).toBe(false); // 23 h 30 le 4
    expect(estJourDEnvoi('2026-11', new Date('2026-11-05T22:59:00Z'))).toBe(true);
    expect(estJourDEnvoi('2026-11', new Date('2026-11-05T23:00:00Z'))).toBe(false); // minuit le 6
    expect(estJourDEnvoi('2026-12', new Date('2026-11-05T09:00:00Z'))).toBe(false);
    expect(estJourDEnvoi('pas-un-mois', new Date())).toBe(false);
  });

  it('prochain rendez-vous : celui du mois jusqu’à son jeudi compris, puis le suivant (décembre → janvier)', () => {
    expect(prochainRendezVous(new Date('2026-11-03T10:00:00Z'))).toEqual({ mois: '2026-11', jour: '2026-11-05' });
    expect(prochainRendezVous(new Date('2026-11-05T20:00:00Z'))).toEqual({ mois: '2026-11', jour: '2026-11-05' });
    expect(prochainRendezVous(new Date('2026-11-06T10:00:00Z'))).toEqual({ mois: '2026-12', jour: '2026-12-03' });
    expect(prochainRendezVous(new Date('2026-12-20T10:00:00Z'))).toEqual({ mois: '2027-01', jour: '2027-01-07' });
  });

  it('mois valide et jour en clair', () => {
    expect(moisValide('2026-12')).toBe(true);
    expect(moisValide('2026-13')).toBe(false);
    expect(moisValide('2026-1')).toBe(false);
    expect(jourEnClair('2026-12-03')).toBe('jeudi 3 décembre 2026');
  });
});
