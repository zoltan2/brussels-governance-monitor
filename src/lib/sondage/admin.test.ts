// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { celluleCsv, csvEntretiens, csvReponses, mediane, synthese } from './admin';
import { ajouterEntretien, creerReponse, majReponse } from './store';
import type { Reponses } from './questionnaire';

let n = 0;
function reponse(
  db: ReturnType<typeof createDb>,
  reponses: Reponses,
  { termine = true, pilote = false, etape = 'fin', langue = 'fr' as 'fr' | 'nl', duree_ms = 90_000 } = {},
) {
  const session = String(++n).padStart(22, 'x');
  creerReponse(db, { session, langue, version: 'v3', jour: '2026-11-17', pilote });
  majReponse(db, { session, reponses, etape, duree_ms, jour: '2026-11-17', termine });
}

describe('synthèse de l’admin', () => {
  it('vue pilote : les seules réponses pilotes, jamais mélangées aux réelles (constat du 30/09)', () => {
    const db = createDb(':memory:');
    reponse(db, { q1: { valeur: 'souvent' } }, { duree_ms: 60_000 });
    reponse(db, { q1: { valeur: 'jamais' }, q1b: { valeur: 'trop_long' } }, { pilote: true, duree_ms: 148_000 });
    reponse(db, { q1: { valeur: 'toujours' } }, { pilote: true, duree_ms: 200_000 });
    reponse(db, { q1: { valeur: 'parfois' } }, { pilote: true, termine: false, etape: 'q2' });

    const p = synthese(db, 'pilote');
    expect(p.vue).toBe('pilote');
    expect(p.terminees).toBe(2);
    expect(p.enCours).toBe(1);
    expect(p.abandonsParEtape).toEqual({ q2: 1 });
    expect(p.questions.find((q) => q.etape === 'q1')).toMatchObject({ n: 2, parOption: { jamais: 1, toujours: 1, souvent: 0 } });
    expect(p.dureeMedianeS).toBe(174);

    const r = synthese(db);
    expect(r.terminees).toBe(1);
    expect(r.questions.find((q) => q.etape === 'q1')).toMatchObject({ n: 1, parOption: { souvent: 1, jamais: 0 } });
    expect(r.dureeMedianeS).toBe(60);
  });

  it('médiane', () => {
    expect(mediane([])).toBeNull();
    expect(mediane([3, 1, 2])).toBe(2);
    expect(mediane([4, 1, 3, 2])).toBe(2.5);
  });

  it('compte en effectifs les seules réponses terminées hors pilote', () => {
    const db = createDb(':memory:');
    reponse(db, { q1: { valeur: 'souvent' }, q2: { valeur: 'manquerait' } });
    reponse(db, { q1: { valeur: 'jamais' }, q1b: { valeur: 'trop_long' } });
    reponse(db, { q1: { valeur: 'souvent' } }, { pilote: true });
    reponse(db, { q1: { valeur: 'toujours' } }, { termine: false, etape: 'q1' });

    const s = synthese(db);
    expect(s.terminees).toBe(2);
    expect(s.pilotes).toBe(1);
    expect(s.enCours).toBe(1);
    expect(s.abandonsParEtape).toEqual({ q1: 1 });
    const q1 = s.questions.find((q) => q.etape === 'q1')!;
    expect(q1).toMatchObject({ concernes: 2, n: 2, parOption: { souvent: 1, jamais: 1, toujours: 0 } });
    // Q2 ne concernait que le lecteur régulier.
    expect(s.questions.find((q) => q.etape === 'q2')).toMatchObject({ concernes: 1, n: 1 });
    expect(s.questions.find((q) => q.etape === 'q1b')).toMatchObject({ concernes: 1, n: 1 });
  });

  it('sépare les verbatims citables des autres', () => {
    const db = createDb(':memory:');
    reponse(db, { q1: { valeur: 'souvent' }, q8: { texte: 'citable', citation: 'oui' } });
    reponse(db, { q1: { valeur: 'souvent' }, q8: { texte: 'privé', citation: 'non' } });
    expect(synthese(db).verbatims).toEqual({ citables: ['citable'], nonCitables: ['privé'] });
  });

  it('Q5 : un nom n’est compté que parmi les répondants à qui il a été proposé', () => {
    const db = createDb(':memory:');
    reponse(db, { q1: { valeur: 'souvent' }, q5: { lignes: { stuut: 'utilise', magazine: 'connu' } } });
    reponse(db, { q1: { valeur: 'souvent' }, q5: { lignes: { magazine: 'inconnu' } } }, { langue: 'nl' });
    reponse(db, { q1: { valeur: 'souvent' }, q5: { lignes: {} } }, { langue: 'nl' });
    const q5 = Object.fromEntries(synthese(db).q5.map((l) => [l.nom, l]));
    // Stuut et Signal : le seul répondant francophone ; les deux néerlandophones
    // ne sont ni « concernés » ni « non répondus ».
    expect(q5.stuut).toMatchObject({ langues: ['fr'], concernes: 1, n: 1, parEtat: { utilise: 1 } });
    expect(q5.signal).toMatchObject({ langues: ['fr'], concernes: 1, n: 0 });
    // Magazine : proposé dans les deux langues, trois concernés, deux réponses.
    expect(q5.magazine).toMatchObject({ langues: ['fr', 'nl'], concernes: 3, n: 2, parEtat: { connu: 1, inconnu: 1 } });
  });
});

describe('exports CSV', () => {
  it('neutralise une formule de tableur', () => {
    expect(celluleCsv('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(celluleCsv('+32')).toBe('"\'+32"');
    expect(celluleCsv('texte')).toBe('"texte"');
  });

  it('l’export des réponses ne contient aucune adresse, celui des entretiens si', () => {
    const db = createDb(':memory:');
    reponse(db, { q1: { valeur: 'souvent' }, q9: { valeur: 'oui' } });
    ajouterEntretien(db, { email: 'volontaire@example.org', langue: 'nl', jour: '2026-11-17' });
    const r = csvReponses(db);
    expect(r).not.toContain('@');
    expect(r.split('\r\n')[0]).toContain('"q9"');
    expect(csvEntretiens(db)).toContain('"volontaire@example.org","","nl","2026-11-17","a_contacter"');
  });

  it('l’export des volontaires porte le téléphone, seul ou avec l’adresse', () => {
    const db = createDb(':memory:');
    ajouterEntretien(db, { telephone: '0470 12 34 56', langue: 'fr', jour: '2026-11-17' });
    ajouterEntretien(db, { email: 'deux@example.org', telephone: '+32 2 123 45 67', langue: 'nl', jour: '2026-11-18' });
    const csv = csvEntretiens(db).split('\r\n');
    expect(csv[0]).toBe('"email","telephone","langue","cree_le","statut"');
    expect(csv).toContain('"","0470 12 34 56","fr","2026-11-17","a_contacter"');
    // « + » en tête : neutralisé comme une formule possible.
    expect(csv).toContain('"deux@example.org","\'+32 2 123 45 67","nl","2026-11-18","a_contacter"');
  });

  it('un volontaire sans aucune coordonnée est refusé (code et base)', () => {
    const db = createDb(':memory:');
    expect(() => ajouterEntretien(db, { email: '', telephone: null, langue: 'fr', jour: '2026-11-17' })).toThrow();
    expect(() =>
      db
        .prepare("INSERT INTO sondage_entretiens (id, langue, cree_le) VALUES ('x', 'fr', '2026-11-17')")
        .run(),
    ).toThrow(/CHECK/);
  });
});
