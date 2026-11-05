// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { choisirDestinataires, lireExclus, type ContactBrut } from './selection';

const MAINTENANT = Date.parse('2026-11-05T07:00:00Z');
const ANCIEN = '2026-06-01T10:00:00Z';

function contact(p: Partial<ContactBrut> = {}): ContactBrut {
  return {
    id: p.id ?? 'c1',
    email: p.email ?? 'abonne@example.org',
    unsubscribed: false,
    createdAt: ANCIEN,
    locale: 'fr',
    motMensuel: '',
    sources: 'website',
    ...p,
  };
}

const vide = { maintenant: MAINTENANT, exclus: new Set<string>(), bienvenueRecue: { ids: new Set<string>(), empreintes: new Set<string>() }, dejaAuJournal: new Set<string>() };

describe('choisirDestinataires', () => {
  it('garde un abonné ordinaire, variante premier mot', () => {
    const s = choisirDestinataires([contact()], vide);
    expect(s.destinataires).toEqual([
      { id: 'c1', email: 'abonne@example.org', langue: 'fr', localeAbonne: 'fr', variante: 'premier' },
    ]);
  });

  it('variante courante pour qui a déjà reçu un numéro', () => {
    const s = choisirDestinataires([contact()], { ...vide, bienvenueRecue: { ids: new Set(['c1']), empreintes: new Set<string>() } });
    expect(s.destinataires[0].variante).toBe('courant');
  });

  it("l'allemand reçoit l'anglais", () => {
    expect(choisirDestinataires([contact({ locale: 'de' })], vide).destinataires[0].langue).toBe('en');
  });

  it.each([
    ['désinscrit', { unsubscribed: true }, 'desinscrit'],
    ['refus « non »', { motMensuel: 'non' }, 'refus'],
    ['refus « NON » avec espaces', { motMensuel: ' NON ' }, 'refus'],
    ['langue absente', { locale: '' }, 'langue'],
    ['langue inconnue', { locale: 'es' }, 'langue'],
    ['date illisible', { createdAt: 'pas une date' }, 'date'],
    ['date absente', { createdAt: undefined }, 'date'],
    ['inscrit il y a 20 jours', { createdAt: '2026-10-16T07:00:01Z' }, 'recent'],
    ['sonde healthcheck', { email: 'healthcheck-1730000000@governance.brussels' }, 'interne'],
    ['domaine du site', { email: 'zoltan@governance.brussels' }, 'interne'],
    ['source healthcheck', { sources: 'website,healthcheck' }, 'interne'],
    ['domaine brusselsgovernance.be', { email: 'contact@brusselsgovernance.be' }, 'interne'],
    ['sous-domaine d’envoi', { email: 'veille@mail.brusselsgovernance.be' }, 'interne'],
  ] as const)('exclut : %s', (_nom, p, motif) => {
    const s = choisirDestinataires([contact(p as Partial<ContactBrut>)], vide);
    expect(s.destinataires).toEqual([]);
    expect(s.exclus[motif]).toBe(1);
  });

  it('inscrit depuis exactement 21 jours : reçoit', () => {
    const s = choisirDestinataires([contact({ createdAt: '2026-10-15T07:00:00Z' })], vide);
    expect(s.destinataires).toHaveLength(1);
  });

  it("21 jours de calendrier à Bruxelles, quelle que soit l'heure : inscrit le 15/10 à 23 h 30, reçoit le 5/11 à 8 h", () => {
    // 15/10 23:30 à Bruxelles (heure d'été) = 21:30 UTC ; 5/11 8:00 (heure d'hiver) = 7:00 UTC.
    const at = Date.parse('2026-11-05T07:00:00Z');
    expect(choisirDestinataires([contact({ createdAt: '2026-10-15T21:30:00Z' })], { ...vide, maintenant: at }).destinataires).toHaveLength(1);
    // 16/10 00:30 à Bruxelles (= 15/10 22:30 UTC) : 20 jours seulement.
    expect(choisirDestinataires([contact({ createdAt: '2026-10-15T22:30:00Z' })], { ...vide, maintenant: at }).exclus.recent).toBe(1);
  });

  it("exemple C : inscrit le 12/11 reçoit le 3/12, inscrit le 13/11 n'y est pas encore (pas d'effet du passage à l'heure d'été)", () => {
    const decembre = Date.parse('2026-12-03T07:00:00Z');
    expect(choisirDestinataires([contact({ createdAt: '2026-11-12T16:00:00Z' })], { ...vide, maintenant: decembre }).destinataires).toHaveLength(1);
    expect(choisirDestinataires([contact({ createdAt: '2026-11-13T08:00:00Z' })], { ...vide, maintenant: decembre }).exclus.recent).toBe(1);
    // Passage à l'heure d'été le 28/03/2027. Envoi le 1/04 à 8 h (6:00 UTC) :
    // inscrit le 11/03 à 23 h 30 (22:30 UTC) reçoit, le 12/03 à 0 h 30 (23:30 UTC la veille) non.
    const avril = Date.parse('2027-04-01T06:00:00Z');
    expect(choisirDestinataires([contact({ createdAt: '2027-03-11T22:30:00Z' })], { ...vide, maintenant: avril }).destinataires).toHaveLength(1);
    expect(choisirDestinataires([contact({ createdAt: '2027-03-11T23:30:00Z' })], { ...vide, maintenant: avril }).exclus.recent).toBe(1);
  });

  it("bienvenue reçue reconnue par l'empreinte d'adresse (contact supprimé puis recréé)", () => {
    const s = choisirDestinataires([contact({ id: 'nouveau', empreinte: 'e1' })], {
      ...vide,
      bienvenueRecue: { ids: new Set<string>(), empreintes: new Set(['e1']) },
    });
    expect(s.destinataires[0].variante).toBe('courant');
    expect(s.destinataires[0].empreinte).toBe('e1');
  });

  it('exclut les adresses de COULISSES_EXCLUS, sans tenir compte de la casse', () => {
    const s = choisirDestinataires([contact({ email: ' Test@Example.org ' })], {
      ...vide,
      exclus: lireExclus('autre@x.be, test@example.org')!,
    });
    expect(s.exclus.interne).toBe(1);
  });

  it('ne reprend pas un contact déjà au journal de ce numéro', () => {
    const s = choisirDestinataires([contact()], { ...vide, dejaAuJournal: new Set(['c1']) });
    expect(s.destinataires).toEqual([]);
    expect(s.exclus.deja_envoye).toBe(1);
  });

  it('une adresse en double ne reçoit qu’un mail', () => {
    const s = choisirDestinataires([contact({ id: 'a' }), contact({ id: 'b', email: 'ABONNE@example.org' })], vide);
    expect(s.destinataires).toHaveLength(1);
  });

  it('garde un contact venu de la précommande du livre', () => {
    expect(choisirDestinataires([contact({ sources: 'livre' })], vide).destinataires).toHaveLength(1);
  });
});

describe('lireExclus', () => {
  it('variable absente : null (envoi refusé)', () => expect(lireExclus(undefined)).toBeNull());
  it('variable vide : aucun exclu, mais définie', () => expect(lireExclus('')!.size).toBe(0));
});
