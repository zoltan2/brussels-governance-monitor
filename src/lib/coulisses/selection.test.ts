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

const vide = { maintenant: MAINTENANT, exclus: new Set<string>(), ontDejaRecu: new Set<string>(), dejaAuJournal: new Set<string>() };

describe('choisirDestinataires', () => {
  it('garde un abonné ordinaire, variante premier mot', () => {
    const s = choisirDestinataires([contact()], vide);
    expect(s.destinataires).toEqual([
      { id: 'c1', email: 'abonne@example.org', langue: 'fr', localeAbonne: 'fr', variante: 'premier' },
    ]);
  });

  it('variante courante pour qui a déjà reçu un numéro', () => {
    const s = choisirDestinataires([contact()], { ...vide, ontDejaRecu: new Set(['c1']) });
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
  ] as const)('exclut : %s', (_nom, p, motif) => {
    const s = choisirDestinataires([contact(p as Partial<ContactBrut>)], vide);
    expect(s.destinataires).toEqual([]);
    expect(s.exclus[motif]).toBe(1);
  });

  it('inscrit depuis exactement 21 jours : reçoit', () => {
    const s = choisirDestinataires([contact({ createdAt: '2026-10-15T07:00:00Z' })], vide);
    expect(s.destinataires).toHaveLength(1);
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
