// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import {
  emailPhase,
  isDigestMdxFrozen,
  chainState,
  isSnapshotStale,
} from './publication-deadlines';

// Semaine 33 : lundi 2026-08-10 → dimanche 2026-08-16.
const w33 = (approved: boolean, sent: boolean) => ({
  approved,
  sent,
  week: '2026-w33',
  weekStart: '2026-08-10',
});
const dimanche33 = new Date('2026-08-16T20:00:00Z');

describe('emailPhase', () => {
  it('ouvert tant que le digest n\'est pas approuvé', () => {
    expect(emailPhase(w33(false, false), dimanche33)).toBe('open');
  });

  it('fermé dès l\'approbation, avant même l\'envoi', () => {
    // Le lot part chez Resend à l'approbation ; scheduledAt ne fait que
    // différer la livraison. C'est l'erreur des trois specs précédentes.
    expect(emailPhase(w33(true, false), dimanche33)).toBe('committed');
  });

  it('fermé une fois envoyé', () => {
    expect(emailPhase(w33(true, true), dimanche33)).toBe('committed');
  });

  it('rouvert quand le brouillon couvre une semaine révolue', () => {
    // Le fichier survit à l'envoi : sans cette borne, le bandeau crierait
    // « ne sera pas dans l'email » six jours sur sept.
    const mardiSuivant = new Date('2026-08-18T09:00:00Z');
    expect(emailPhase(w33(true, true), mardiSuivant)).toBe('open');
  });

  it('inconnu quand le fichier est illisible — jamais supposé ouvert', () => {
    expect(emailPhase(null, dimanche33)).toBe('unknown');
  });
});

describe('isDigestMdxFrozen', () => {
  // `digest.yml` porte `cron: '0 22 * * 0'`, en UTC. Raisonner en heure de
  // Bruxelles introduit une heure de dérive tout l'hiver.
  it('pas encore figé dimanche 21h59 UTC', () => {
    expect(isDigestMdxFrozen(new Date('2026-08-09T21:59:00Z'))).toBe(false);
  });

  it('figé dimanche 22h UTC pile', () => {
    expect(isDigestMdxFrozen(new Date('2026-08-09T22:00:00Z'))).toBe(true);
  });

  it('figé le lundi, quelle que soit la saison', () => {
    expect(isDigestMdxFrozen(new Date('2026-08-10T09:00:00Z'))).toBe(true);
    expect(isDigestMdxFrozen(new Date('2026-01-12T09:00:00Z'))).toBe(true);
  });

  it('en hiver, le seuil tombe dimanche 22h UTC, soit 23h à Bruxelles', () => {
    // Le piège : à 22h30 UTC un dimanche de janvier il est 23h30 à
    // Bruxelles, pas encore minuit — et pourtant c'est déjà figé.
    expect(isDigestMdxFrozen(new Date('2026-01-11T22:30:00Z'))).toBe(true);
  });

  it('libre le reste de la semaine', () => {
    expect(isDigestMdxFrozen(new Date('2026-08-12T09:00:00Z'))).toBe(false);
  });
});

describe('chainState', () => {
  // Mercredi de la semaine 33, dont le brouillon n'est pas encore préparé.
  const wednesday = new Date('2026-08-12T09:00:00Z');
  const w33ouvert = { approved: false, sent: false, week: '2026-w33', weekStart: '2026-08-10' };
  const w33approuve = { approved: true, sent: false, week: '2026-w33', weekStart: '2026-08-10' };

  it('annonce que la veille sera dans l\'email quand le digest est ouvert', () => {
    const s = chainState(w33ouvert, wednesday);
    expect(s.email).toBe('open');
    expect(s.urgent).toBe(false);
  });

  it('alerte quand le digest est déjà approuvé', () => {
    const s = chainState(w33approuve, wednesday);
    expect(s.email).toBe('committed');
    expect(s.urgent).toBe(true);
    expect(s.emailDetail).toMatch(/ne sera pas dans l'email/i);
  });

  it('alerte aussi quand l\'état est illisible', () => {
    const s = chainState(null, wednesday);
    expect(s.email).toBe('unknown');
    expect(s.urgent).toBe(true);
  });

  it('signale le gel des MDX indépendamment de l\'email', () => {
    const s = chainState(w33ouvert, new Date('2026-08-09T23:00:00Z'));
    expect(s.email).toBe('open');
    expect(s.mdxFrozen).toBe(true);
  });
});

describe('chainState, instantané périmé — le lundi', () => {
  // L'instantané RÉEL de la semaine 32, tel que `data/pending-digest.json` le
  // porte : `weekStart` est le lundi de la semaine ÉCOULÉE, et le fichier
  // survit à l'envoi. La borne des sept jours tombe donc lundi 00:00 UTC, et
  // le lundi est l'un des deux jours où l'essentiel des PR sont fusionnées.
  const w32Parti = {
    approved: true,
    sent: true,
    week: '2026-w32',
    weekStart: '2026-08-03',
  };
  const lundi = new Date('2026-08-10T09:00:00Z');

  it('reconnaît que l\'instantané couvre une semaine révolue', () => {
    expect(isSnapshotStale(w32Parti, lundi)).toBe(true);
    // La veille au soir, la semaine court encore.
    expect(isSnapshotStale(w32Parti, new Date('2026-08-09T20:00:00Z'))).toBe(false);
  });

  it('garde la phase « open » : cette veille ira dans l\'email suivant', () => {
    expect(emailPhase(w32Parti, lundi)).toBe('open');
    expect(chainState(w32Parti, lundi).email).toBe('open');
  });

  it('n\'affirme JAMAIS « pas encore approuvé » sur un instantané qui dit l\'inverse', () => {
    const s = chainState(w32Parti, lundi);
    expect(s.emailDetail).not.toMatch(/pas encore approuvé/i);
    expect(s.emailDetail).toMatch(/déjà parti/i);
    expect(s.emailDetail).toMatch(/semaine prochaine/i);
  });

  it('garde le message « pas encore approuvé » quand l\'instantané périmé n\'était pas parti', () => {
    // Semaine révolue ET jamais approuvée : rien n'est parti, la phrase
    // d'origine reste vraie. Le troisième cas ne doit pas la manger.
    const s = chainState({ ...w32Parti, approved: false, sent: false }, lundi);
    expect(s.email).toBe('open');
    expect(s.emailDetail).toMatch(/pas encore approuvé/i);
  });

  it('ne change rien au cas nominal d\'un instantané de la semaine en cours', () => {
    const s = chainState(
      { approved: false, sent: false, week: '2026-w33', weekStart: '2026-08-10' },
      new Date('2026-08-12T09:00:00Z'),
    );
    expect(s.emailDetail).toMatch(/pas encore approuvé/i);
    expect(s.emailDetail).not.toMatch(/déjà parti/i);
  });
});
