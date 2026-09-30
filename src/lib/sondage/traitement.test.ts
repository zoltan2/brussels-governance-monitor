// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createDb } from '@/lib/db';
import { traiterEnvoi, DUREE_MIN_MS, LIMITE_SESSION, type Dependances } from './traitement';
import { lireReponse, tousLesEntretiens } from './store';

const CAMPAGNE = { ouverture: '2026-10-12', cloture: '2026-12-06' };
const DEBUT = new Date('2026-11-16T09:00:00Z');

let db: DatabaseSync;
let horloge: number;
let vus: Map<string, number>;
let compteurIp = 0;
let ip: string;

function deps(extra: Partial<Dependances> = {}): Dependances {
  return { db, maintenant: new Date(horloge), campagne: CAMPAGNE, piloteEnv: false, vus, ...extra };
}

/** Avance l'horloge du serveur, comme un lecteur qui prend son temps. */
function attendre(ms: number) {
  horloge += ms;
}

function envoyer(corps: unknown, session?: string, extra: Partial<Dependances> = {}) {
  return traiterEnvoi({ corps, session, ip }, deps(extra));
}

function commencer(extra: Partial<Dependances> = {}, pilote?: boolean): string {
  const r = envoyer({ etape: 'accueil', langue: 'fr', ...(pilote ? { pilote } : {}) }, undefined, extra);
  expect(r.status).toBe(200);
  expect(r.session).toMatch(/^[A-Za-z0-9_-]{22}$/);
  return r.session!;
}

function choix(etape: string, valeur: string | null, autre?: string) {
  return { etape, reponse: autre === undefined ? { valeur } : { valeur, autre } };
}

/** Parcours complet « lecteur régulier », 5 s par écran. */
function parcoursComplet(session: string, q9: { valeur: 'oui' | 'non' | null; email?: string }) {
  const etapes: unknown[] = [
    choix('q1', 'souvent'),
    choix('q2', 'regrettable'),
    choix('q3', 'un'),
    choix('q4', 'rarement'),
    choix('q4b', 'temps'),
    { etape: 'q5', reponse: { lignes: { magazine: 'connu', radar: 'inconnu' } } },
    choix('q6a', 'inconnu'),
    choix('q6b', 'peut_etre'),
    choix('q7', 'plus_court'),
    { etape: 'q8', reponse: { texte: 'Un mot TEMOIN-VERBATIM', citation: 'oui' } },
  ];
  for (const corps of etapes) {
    attendre(5_000);
    const r = envoyer(corps, session);
    expect(r.status, JSON.stringify(r.corps)).toBe(200);
  }
  attendre(5_000);
  return envoyer({ etape: 'q9', reponse: q9 }, session);
}

beforeEach(() => {
  db = createDb(':memory:');
  horloge = DEBUT.getTime();
  vus = new Map();
  ip = `198.51.100.${++compteurIp}`;
});

describe('branches du parcours', () => {
  it('Q1 « rarement » mène à Q1b, puis directement à Q7', () => {
    const s = commencer();
    attendre(3_000);
    expect(envoyer(choix('q1', 'rarement'), s).corps.suivante).toBe('q1b');
    attendre(3_000);
    expect(envoyer(choix('q1b', 'autre', 'trop de mails'), s).corps.suivante).toBe('q7');
    // Q2 n'est plus sur le parcours : refusée.
    expect(envoyer(choix('q2', 'regrettable'), s).status).toBe(409);
    expect(lireReponse(db, s)?.reponses.q1b).toEqual({ valeur: 'autre', autre: 'trop de mails' });
  });

  it('Q1 « souvent » mène à Q2, et Q1b est refusée', () => {
    const s = commencer();
    expect(envoyer(choix('q1', 'souvent'), s).corps.suivante).toBe('q2');
    const r = envoyer(choix('q1b', 'trop_long'), s);
    expect(r.status).toBe(409);
    expect(r.corps.erreur).toBe('hors_parcours');
  });

  it('Q4 « de temps en temps » mène à Q4a, « jamais » à Q4b', () => {
    const s = commencer();
    envoyer(choix('q1', 'toujours'), s);
    expect(envoyer(choix('q4', 'de_temps_en_temps'), s).corps.suivante).toBe('q4a');
    expect(envoyer(choix('q4b', 'temps'), s).status).toBe(409);
    expect(envoyer(choix('q4', 'jamais'), s).corps.suivante).toBe('q4b');
    expect(envoyer(choix('q4b', 'temps'), s).status).toBe(200);
  });

  it('changer Q1 retire les réponses devenues hors parcours', () => {
    const s = commencer();
    envoyer(choix('q1', 'jamais'), s);
    envoyer(choix('q1b', 'habitude'), s);
    envoyer(choix('q1', 'parfois'), s);
    expect(lireReponse(db, s)?.reponses.q1b).toBeUndefined();
  });

  it("le champ « autre » n'est gardé que si « autre » est choisi", () => {
    const s = commencer();
    envoyer(choix('q1', 'jamais'), s);
    envoyer(choix('q1b', 'trop_long', 'texte glissé'), s);
    expect(lireReponse(db, s)?.reponses.q1b).toEqual({ valeur: 'trop_long' });
  });
});

describe('valeurs refusées (liste fermée)', () => {
  it.each([
    ['valeur inconnue', choix('q1', 'quotidien')],
    ['Q1 sans réponse (obligatoire)', choix('q1', null)],
    ['Q2 sans réponse (obligatoire)', choix('q2', null)],
    ['étape inconnue', choix('q10', 'oui')],
    ['clé en trop', { etape: 'q3', reponse: { valeur: 'un', commentaire: 'libre' } }],
    ['clé en trop à la racine', { ...choix('q3', 'un'), email: 'x@example.org' }],
    ['état Q5 inconnu', { etape: 'q5', reponse: { lignes: { magazine: 'adore' } } }],
    ['nom Q5 inconnu', { etape: 'q5', reponse: { lignes: { podcast: 'connu' } } }],
    ['Q8 trop long', { etape: 'q8', reponse: { texte: 'x'.repeat(201), citation: 'non' } }],
    ['citation Q8 inconnue', { etape: 'q8', reponse: { texte: 'a', citation: 'peut-être' } }],
    ['corps nul', null],
  ])('%s → 400', (_, corps) => {
    const s = commencer();
    envoyer(choix('q1', 'souvent'), s);
    const r = envoyer(corps, s);
    expect(r.status).toBe(400);
    expect(r.corps.erreur).toBe('invalide');
  });

  it('une question facultative accepte « non répondue »', () => {
    const s = commencer();
    envoyer(choix('q1', 'souvent'), s);
    expect(envoyer(choix('q3', null), s).status).toBe(200);
  });

  it('une Q5 partielle laisse les autres lignes non répondues', () => {
    const s = commencer();
    envoyer(choix('q1', 'souvent'), s);
    envoyer({ etape: 'q5', reponse: { lignes: { stuut: 'utilise' } } }, s);
    expect(lireReponse(db, s)?.reponses.q5).toEqual({ lignes: { stuut: 'utilise' } });
  });
});

describe('champ piège', () => {
  it("un robot qui remplit le champ reçoit un succès et rien n'est écrit", () => {
    const r = envoyer({ etape: 'accueil', langue: 'fr', site: 'http://spam.example' });
    expect(r.status).toBe(200);
    expect(r.session).toBeUndefined();
    expect(db.prepare('SELECT COUNT(*) AS n FROM sondage_reponses').get()).toEqual({ n: 0 });
  });

  it('même sur un écran de question, la réponse piégée est ignorée', () => {
    const s = commencer();
    const r = envoyer({ ...choix('q1', 'souvent'), site: 'x' }, s);
    expect(r.status).toBe(200);
    expect(lireReponse(db, s)?.reponses.q1).toBeUndefined();
  });

  it('un champ piège vide est accepté', () => {
    const s = commencer();
    expect(envoyer({ ...choix('q1', 'souvent'), site: '' }, s).status).toBe(200);
    expect(lireReponse(db, s)?.reponses.q1).toEqual({ valeur: 'souvent' });
  });
});

describe('durée minimale de 20 s', () => {
  it('un parcours terminé en moins de 20 s est ignoré, adresse comprise', () => {
    const s = commencer();
    envoyer(choix('q1', 'jamais'), s);
    envoyer(choix('q1b', 'trop_long'), s);
    envoyer(choix('q7', 'rien'), s);
    envoyer({ etape: 'q8', reponse: { texte: '', citation: 'non' } }, s);
    attendre(DUREE_MIN_MS - 1_000);
    const r = envoyer({ etape: 'q9', reponse: { valeur: 'oui', email: 'robot@example.org' } }, s);
    expect(r.status).toBe(200);
    expect(r.corps.termine).toBe(true);
    expect(lireReponse(db, s)).toBeNull();
    expect(tousLesEntretiens(db)).toEqual([]);
  });

  it('au-delà de 20 s, la réponse est gardée', () => {
    const s = commencer();
    const r = parcoursComplet(s, { valeur: 'non' });
    expect(r.status).toBe(200);
    const l = lireReponse(db, s);
    expect(l?.termine).toBe(true);
    expect(l?.duree_ms).toBe(55_000);
  });

  it('une longue pause ne compte que pour 10 minutes', () => {
    const s = commencer();
    attendre(3 * 3_600_000);
    envoyer(choix('q1', 'souvent'), s);
    expect(lireReponse(db, s)?.duree_ms).toBe(600_000);
  });
});

describe('verrouillage après « Terminer »', () => {
  it("une réponse terminée ne se modifie plus, et « Commencer » ne l'ouvre pas", () => {
    const s = commencer();
    parcoursComplet(s, { valeur: 'non' });
    const avant = lireReponse(db, s);
    const r = envoyer(choix('q1', 'jamais'), s);
    expect(r.status).toBe(409);
    expect(r.corps.erreur).toBe('deja_termine');
    expect(envoyer({ etape: 'accueil', langue: 'fr' }, s).status).toBe(409);
    expect(lireReponse(db, s)).toEqual(avant);
  });

  it('reprise : « Commencer » avec une session en cours ne crée pas de doublon', () => {
    const s = commencer();
    envoyer(choix('q1', 'souvent'), s);
    const r = envoyer({ etape: 'accueil', langue: 'fr' }, s);
    expect(r.status).toBe(200);
    expect(r.session).toBeUndefined();
    expect(db.prepare('SELECT COUNT(*) AS n FROM sondage_reponses').get()).toEqual({ n: 1 });
  });

  it('une question sans session est refusée', () => {
    expect(envoyer(choix('q1', 'souvent')).corps.erreur).toBe('session_absente');
    expect(envoyer(choix('q1', 'souvent'), 'inventee-par-un-tiers-xx').status).toBe(409);
  });

  it('la fin exige les obligatoires du parcours', () => {
    const s = commencer();
    envoyer(choix('q1', 'souvent'), s);
    attendre(30_000);
    const r = envoyer({ etape: 'q9', reponse: { valeur: 'non' } }, s);
    expect(r.status).toBe(400);
    expect(r.corps).toMatchObject({ erreur: 'incomplet', etape: 'q2' });
    expect(lireReponse(db, s)?.termine).toBe(false);
  });
});

describe('période de campagne', () => {
  it.each([
    ['avant l’ouverture', '2026-10-11T12:00:00Z', 'sondage_pas_ouvert'],
    ['après la clôture', '2026-12-07T12:00:00Z', 'sondage_clos'],
  ])('%s : 410, rien écrit', (_, date, erreur) => {
    horloge = new Date(date).getTime();
    const r = envoyer({ etape: 'accueil', langue: 'fr' });
    expect(r.status).toBe(410);
    expect(r.corps.erreur).toBe(erreur);
    expect(db.prepare('SELECT COUNT(*) AS n FROM sondage_reponses').get()).toEqual({ n: 0 });
  });

  it('le jour de clôture est encore ouvert, jusqu’à minuit à Bruxelles', () => {
    horloge = new Date('2026-12-06T22:30:00Z').getTime(); // 23:30 à Bruxelles
    expect(envoyer({ etape: 'accueil', langue: 'fr' }).status).toBe(200);
    horloge = new Date('2026-12-06T23:30:00Z').getTime(); // 00:30 le 7
    expect(envoyer({ etape: 'accueil', langue: 'fr' }).status).toBe(410);
  });

  it('une session commencée ne peut plus rien enregistrer après la clôture', () => {
    horloge = new Date('2026-12-06T20:00:00Z').getTime();
    const s = commencer();
    horloge = new Date('2026-12-07T08:00:00Z').getTime();
    expect(envoyer(choix('q1', 'souvent'), s).status).toBe(410);
  });
});

describe('mode pilote', () => {
  it('sans pilote, la réponse ne porte pas la marque', () => {
    expect(lireReponse(db, commencer())?.pilote).toBe(false);
  });

  it('la variable SONDAGE_PILOTE marque la réponse', () => {
    expect(lireReponse(db, commencer({ piloteEnv: true }))?.pilote).toBe(true);
  });

  it('le paramètre ?pilote=1, transmis par la page, marque la réponse', () => {
    expect(lireReponse(db, commencer({}, true))?.pilote).toBe(true);
  });
});

describe('Q9 : l’adresse des volontaires', () => {
  it('« oui » avec une adresse valide : enregistrée à part, jamais dans les réponses', () => {
    const s = commencer();
    const r = parcoursComplet(s, { valeur: 'oui', email: '  Lectrice@Example.org ' });
    expect(r.status).toBe(200);
    expect(tousLesEntretiens(db)).toEqual([
      { email: 'lectrice@example.org', langue: 'fr', cree_le: '2026-11-16', statut: 'a_contacter' },
    ]);
    const brut = db.prepare('SELECT reponses FROM sondage_reponses').get() as { reponses: string };
    expect(brut.reponses).not.toContain('example.org');
    expect(JSON.parse(brut.reponses).q9).toEqual({ valeur: 'oui' });
  });

  it('« pas cette fois » avec une adresse : rien n’est enregistré', () => {
    const s = commencer();
    parcoursComplet(s, { valeur: 'non', email: 'glissee@example.org' });
    expect(tousLesEntretiens(db)).toEqual([]);
    const brut = db.prepare('SELECT reponses FROM sondage_reponses').get() as { reponses: string };
    expect(brut.reponses).not.toContain('example.org');
  });

  it('Q9 non répondue avec une adresse : rien n’est enregistré', () => {
    const s = commencer();
    parcoursComplet(s, { valeur: null, email: 'glissee@example.org' });
    expect(tousLesEntretiens(db)).toEqual([]);
  });

  it.each([
    ['vide', '', 'email_vide'],
    ['invalide', 'pas-une-adresse', 'email_invalide'],
    ['avec invisible', 'a​@example.org', 'email_invalide'],
  ])('« oui » avec une adresse %s : 400, rien de terminé', (_, email, erreur) => {
    const s = commencer();
    const r = parcoursComplet(s, { valeur: 'oui', email });
    expect(r.status).toBe(400);
    expect(r.corps.erreur).toBe(erreur);
    expect(tousLesEntretiens(db)).toEqual([]);
    expect(lireReponse(db, s)?.termine).toBe(false);
  });

  it('les dates stockées sont au jour près', () => {
    const s = commencer();
    parcoursComplet(s, { valeur: 'non' });
    const l = db.prepare('SELECT cree_le, maj_le FROM sondage_reponses').get() as Record<string, string>;
    expect(l).toEqual({ cree_le: '2026-11-16', maj_le: '2026-11-16' });
  });
});

describe('limites de débit', () => {
  it('douze écrans rapides passent', () => {
    const s = commencer();
    for (let i = 0; i < 12; i++) {
      expect(envoyer(choix('q3', 'un'), s).status).not.toBe(429);
      if (i === 0) envoyer(choix('q1', 'souvent'), s);
    }
  });

  it('au-delà de la limite par session : 429', () => {
    const s = commencer();
    envoyer(choix('q1', 'souvent'), s);
    let dernier = 200;
    for (let i = 0; i < LIMITE_SESSION + 1; i++) dernier = envoyer(choix('q3', 'un'), s).status;
    expect(dernier).toBe(429);
  });
});
