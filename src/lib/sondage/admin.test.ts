// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { celluleCsv, csvEntretiens, csvReponses, synthese } from './admin';
import { ajouterEntretien, creerReponse, majReponse } from './store';
import type { Reponses } from './questionnaire';

let n = 0;
function reponse(
  db: ReturnType<typeof createDb>,
  reponses: Reponses,
  { termine = true, pilote = false, etape = 'fin' } = {},
) {
  const session = String(++n).padStart(22, 'x');
  creerReponse(db, { session, langue: 'fr', version: 'v3', jour: '2026-11-17', pilote });
  majReponse(db, { session, reponses, etape, duree_ms: 90_000, jour: '2026-11-17', termine });
}

describe('synthèse de l’admin', () => {
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
    expect(csvEntretiens(db)).toContain('"volontaire@example.org","nl","2026-11-17","a_contacter"');
  });
});
