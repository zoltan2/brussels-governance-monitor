// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { estPageSansWidgets } from '@/lib/pages-sans-widgets';
import { etatInitial } from './page-etat';
import { creerReponse, majReponse } from './store';
import { campagneDepuisEnv } from './campagne';

const CAMPAGNE = { ouverture: '2026-10-12', cloture: '2026-12-06' };
const PENDANT = new Date('2026-11-20T10:00:00Z');
const S = 'b'.repeat(22);

describe('état de la page à l’arrivée', () => {
  it('hors période : clos ou pas encore ouvert, sans lire la base', () => {
    expect(etatInitial(null, S, new Date('2026-12-07T10:00:00Z'), CAMPAGNE)).toEqual({ mode: 'clos' });
    expect(etatInitial(null, S, new Date('2026-10-01T10:00:00Z'), CAMPAGNE)).toEqual({ mode: 'pas_encore' });
  });

  it('reprise dans la même session, à l’écran suivant le dernier enregistré', () => {
    const db = createDb(':memory:');
    creerReponse(db, { session: S, langue: 'fr', version: 'v3', jour: '2026-11-20', pilote: false });
    majReponse(db, { session: S, reponses: { q1: { valeur: 'jamais' } }, etape: 'q1', duree_ms: 5000, jour: '2026-11-20', termine: false });
    expect(etatInitial(db, S, PENDANT, CAMPAGNE)).toEqual({
      mode: 'reprise',
      reponses: { q1: { valeur: 'jamais' } },
      etape: 'q1b',
    });
  });

  it('verrouillage : une réponse terminée affiche « déjà répondu »', () => {
    const db = createDb(':memory:');
    creerReponse(db, { session: S, langue: 'fr', version: 'v3', jour: '2026-11-20', pilote: false });
    majReponse(db, { session: S, reponses: {}, etape: 'fin', duree_ms: 90_000, jour: '2026-11-20', termine: true });
    expect(etatInitial(db, S, PENDANT, CAMPAGNE)).toEqual({ mode: 'termine' });
  });

  it('cookie inconnu ou mal formé : accueil', () => {
    const db = createDb(':memory:');
    expect(etatInitial(db, "x' OR 1=1 --", PENDANT, CAMPAGNE)).toEqual({ mode: 'accueil' });
    expect(etatInitial(db, undefined, PENDANT, CAMPAGNE)).toEqual({ mode: 'accueil' });
  });
});

describe('configuration de la campagne', () => {
  it('défauts : ouverture la semaine du pilote, clôture le 06/12/2026', () => {
    expect(campagneDepuisEnv({})).toEqual({ ouverture: '2026-10-12', cloture: '2026-12-06' });
  });

  it('une date mal formée est ignorée, jamais interprétée', () => {
    expect(campagneDepuisEnv({ SONDAGE_CLOTURE: '2026-02-31', SONDAGE_OUVERTURE: 'demain' })).toEqual({
      ouverture: '2026-10-12',
      cloture: '2026-12-06',
    });
    expect(campagneDepuisEnv({ SONDAGE_OUVERTURE: '2026-11-16' }).ouverture).toBe('2026-11-16');
  });
});

describe('pages sans chat ni jeux', () => {
  it.each(['/fr/sondage', '/nl/enquete', '/nl/enquete/'])('%s : sans widgets', (chemin) => {
    expect(estPageSansWidgets(chemin)).toBe(true);
  });
  it.each(['/fr', '/en/sondage', '/fr/sondages', null])('%s : widgets montés', (chemin) => {
    expect(estPageSansWidgets(chemin)).toBe(false);
  });
});
