// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.AUTH_SECRET = 'secret-auth';
const { getDb } = await import('@/lib/db');
const { etatAdmin, joursRestants, lireTextes, manques } = await import('./admin');
const J = await import('./journal');

const L = (objet: string, corps: string, extra = {}) => ({ objet, corps, apercu: '', ...extra });

describe('admin des coulisses', () => {
  it('textes : nettoyés ; retour à la ligne refusé dans un objet ou un aperçu ; bloc sondage seulement pour la bienvenue', () => {
    const t = lireTextes({ fr: L('Objet', '<p>a<script>x</script></p>', { sondage: '<p>s</p>' }), nl: L('', ''), en: L('', '') }, true)!;
    expect(t.fr.corps).toBe('<p>a</p>');
    expect(t.fr.sondage).toBe('<p>s</p>');
    expect(lireTextes({ fr: L('a\r\nBcc: x@y.z', '') }, false)).toBeNull();
    expect(lireTextes({ fr: { ...L('a', ''), apercu: 'ligne\nautre' } }, false)).toBeNull();
    expect(lireTextes({ fr: L('a', 'x'.repeat(60_001)) }, false)).toBeNull();
    expect(lireTextes({ fr: L('a', '<p>x</p>', { sondage: '<p>s</p>' }) }, false)!.fr.sondage).toBeUndefined();
  });

  it('jours restants avant le jeudi, à Bruxelles', () => {
    expect(joursRestants('2026-12-03', new Date('2026-12-01T08:00:00Z'))).toBe(2);
    expect(joursRestants('2026-12-03', new Date('2026-12-03T22:00:00Z'))).toBe(0);
  });

  it('rappel : signale bienvenue absente, repère manquant et essai absent ; rien pour un rendez-vous envoyé', () => {
    const db = getDb()!;
    const vide = etatAdmin(db, '2026-12', Date.parse('2026-12-01T08:00:00Z'));
    expect(manques(vide).join(' ')).toContain('Bienvenue incomplète');
    J.enregistrerBienvenue(db, {
      fr: L('a', '<p>sans repère</p>', { sondage: '<p>bloc</p>' }),
      nl: L('b', '<p>x</p>'),
      en: L('c', '<p>y</p>'),
    });
    const e = etatAdmin(db, '2026-12', Date.parse('2026-12-01T08:00:00Z'));
    expect(e.repereManquant).toEqual(['fr']);
    expect(manques(e)).toEqual(['Repère [sondage] absent de la bienvenue (fr).', 'Pas d’essai sur le contenu actuel.']);
    expect(manques({ ...e, etat: 'envoye' })).toEqual([]);
  });

  it("signale un lien vers le sondage écrit hors du bloc, et un rendez-vous d'avant la séparation resté sans mois", () => {
    const db = getDb()!;
    db.exec('DELETE FROM coulisses_numeros; DELETE FROM coulisses_bienvenue;');
    J.enregistrerBienvenue(db, {
      fr: L('a', '<p><a href="https://governance.brussels/fr/sondage">sondage</a></p>'),
      nl: L('b', '<p>[sondage]</p>', { sondage: '<p><a href="https://governance.brussels/nl/sondage">x</a></p>' }),
      en: L('c', '<p>y</p>'),
    });
    db.prepare(`INSERT INTO coulisses_numeros (numero, textes, modifie_le, etat) VALUES (7, '{}', 0, 'brouillon')`).run();
    const e = etatAdmin(db, '2026-12', Date.parse('2026-12-01T08:00:00Z'));
    expect(e.sondageEnDur).toEqual(['fr']);
    expect(e.orphelins).toEqual([7]);
    expect(manques(e).join(' ')).toContain('Lien vers le sondage');
  });
});
