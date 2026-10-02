// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Thèmes en silence (lot 3 de l'abonnement, 02/10/2026). Un abonné dont aucun
 * thème n'a bougé ne reçoit pas de digest : c'est voulu. Cette mesure dit à la
 * rédaction QUI ne reçoit plus rien et SUR QUOI, pour aller vérifier s'il y a
 * du neuf. Elle utilise la règle même de l'envoi (`filterUpdatesForSubscriber`),
 * la vraie, pas une copie.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/content', () => ({
  getDomainCards: () => [],
  getDossierCards: () => [],
  getSectorCards: () => [],
  getCommuneCards: () => [],
  getLocalizedSlug: () => '',
}));

const { filterUpdatesForSubscriber } = await import('./digest-updates');
const { calculerThemesMuets, lireInstantane, FENETRE_JOURS, AGE_MAX_HEURES } = await import('./themes-muets');

const MAINTENANT = new Date('2026-10-02T06:30:00Z');
type Fiche = { domain: string; section: string; lastModified: string };
const fiche = (domain: string, section: string, lastModified: string): Fiche => ({ domain, section, lastModified });

// 2 octobre : la fenêtre de 14 jours commence le 18 septembre.
const FICHES: Fiche[] = [
  fiche('budget', 'domains', '2026-10-02'),
  fiche('housing', 'domains', '2026-09-18'),
  fiche('education', 'domains', '2026-08-01'),
  fiche('mobility', 'domains', '2026-09-17'),
  fiche('dossier-lez', 'dossiers', '2026-09-19'),
  fiche('dossier-slrb', 'dossiers', '2026-06-01'),
  fiche('horeca', 'sectors', '2026-07-10'),
  fiche('commune-ixelles', 'communes', '2026-09-30'),
];

const calculer = (contacts: Array<{ topics: string[] }>, fiches = FICHES) =>
  calculerThemesMuets({
    contacts,
    fiches,
    maintenant: MAINTENANT,
    filtrer: (f, topics) => filterUpdatesForSubscriber(f as never, topics) as never,
  });

describe('calculerThemesMuets', () => {
  it('la fenêtre est de deux semaines, bornes comprises', () => {
    expect(FENETRE_JOURS).toBe(14);
    // housing a bougé le 18/09, premier jour de la fenêtre : pas muet.
    // mobility a bougé le 17/09, la veille : muet.
    const r = calculer([{ topics: ['housing'] }, { topics: ['mobility'] }]);
    expect(r.abonnesEnSilence).toBe(1);
    expect(r.themesMuets.map((t) => t.theme)).toEqual(['mobility']);
  });

  it('compte les personnes dont TOUS les thèmes sont restés muets', () => {
    const r = calculer([
      { topics: ['education'] },
      { topics: ['education', 'budget'] },
      { topics: ['dossier-slrb', 'horeca'] },
      { topics: ['budget'] },
    ]);
    expect(r.abonnes).toBe(4);
    expect(r.abonnesEnSilence).toBe(2);
  });

  it('liste les thèmes muets, triés par nombre d’abonnés, avec leur dernière mise à jour', () => {
    const r = calculer([
      { topics: ['education'] },
      { topics: ['education', 'budget'] },
      { topics: ['dossier-slrb'] },
      { topics: ['mobility', 'education'] },
    ]);
    expect(r.themesMuets).toEqual([
      { theme: 'education', abonnes: 3, derniereMaj: '2026-08-01' },
      { theme: 'dossier-slrb', abonnes: 1, derniereMaj: '2026-06-01' },
      { theme: 'mobility', abonnes: 1, derniereMaj: '2026-09-17' },
    ]);
  });

  it('plusieurs fiches pour un thème : la dernière mise à jour est la plus récente', () => {
    const fiches = [
      fiche('dossier-a', 'dossiers', '2026-05-01'),
      fiche('dossier-b', 'dossiers', '2026-06-20'),
      fiche('dossier-c', 'dossiers', '2026-03-15'),
    ];
    expect(calculer([{ topics: ['dossiers'] }], fiches).themesMuets).toEqual([
      { theme: 'dossiers', abonnes: 1, derniereMaj: '2026-06-20' },
    ]);
  });

  it('un thème que personne ne suit n’apparaît pas, même muet', () => {
    expect(calculer([{ topics: ['budget'] }]).themesMuets).toEqual([]);
  });

  it('suit la règle de l’envoi : un secteur reçoit les mises à jour de son domaine parent', () => {
    // horeca (secteur) n'a pas bougé, mais son domaine parent `employment` oui.
    const fiches = [...FICHES, fiche('employment', 'domains', '2026-10-01')];
    const r = calculer([{ topics: ['horeca'] }], fiches);
    expect(r.abonnesEnSilence).toBe(0);
    expect(r.themesMuets).toEqual([]);
  });

  it('suit la règle de l’envoi : « dossiers » et « communes » couvrent toute leur section', () => {
    const r = calculer([{ topics: ['dossiers'] }, { topics: ['communes'] }]);
    expect(r.abonnesEnSilence).toBe(0);
    const sansDossierRecent = FICHES.filter((f) => f.domain !== 'dossier-lez');
    const s = calculer([{ topics: ['dossiers'] }], sansDossierRecent);
    expect(s.themesMuets).toEqual([{ theme: 'dossiers', abonnes: 1, derniereMaj: '2026-06-01' }]);
  });

  it('un abonné sans aucun thème reçoit tout : il n’est pas en silence', () => {
    expect(calculer([{ topics: [] }]).abonnesEnSilence).toBe(0);
  });

  it('met à part les thèmes qui ne déclenchent jamais d’envoi', () => {
    const r = calculer([
      { topics: ['engagements'] },
      { topics: ['solutions', 'engagements'] },
      { topics: ['engagements', 'budget'] },
    ]);
    expect(r.sansEnvoiPossible).toEqual({ themes: ['engagements', 'solutions'], abonnesSeuls: 2 });
    expect(r.themesMuets.map((t) => t.theme)).not.toContain('engagements');
    // Ils ne recevront jamais rien : ils comptent parmi les personnes en silence.
    expect(r.abonnesEnSilence).toBe(2);
  });

  it('un thème sans aucune fiche connue : date de dernière mise à jour inconnue', () => {
    const r = calculer([{ topics: ['dossier-disparu'] }]);
    expect(r.themesMuets).toEqual([{ theme: 'dossier-disparu', abonnes: 1, derniereMaj: null }]);
  });

  it('accepte une date de fiche horodatée', () => {
    const r = calculer([{ topics: ['housing'] }], [fiche('housing', 'domains', '2026-09-18T00:00:00.000Z')]);
    expect(r.abonnesEnSilence).toBe(0);
  });

  it('ne garde que des comptes : aucune adresse dans le résultat', () => {
    const r = calculer([{ topics: ['education'], email: 'lecteur@example.org' } as never]);
    expect(JSON.stringify(r)).not.toContain('example.org');
    expect(r.calculeLe).toBe('2026-10-02T06:30:00.000Z');
    expect(r.fenetreJours).toBe(14);
  });
});

describe('lireInstantane', () => {
  const frais = { calculeLe: '2026-10-02T06:30:00.000Z', fenetreJours: 14, abonnes: 3, abonnesEnSilence: 1, themesMuets: [], sansEnvoiPossible: { themes: [], abonnesSeuls: 0 } };

  it('instantané récent : rendu tel quel', () => {
    expect(lireInstantane(frais, MAINTENANT)).toEqual({ etat: 'frais', instantane: frais });
  });

  it('absent ou illisible : « absent », jamais un zéro', () => {
    expect(lireInstantane(null, MAINTENANT)).toEqual({ etat: 'absent' });
    expect(lireInstantane({ abonnes: 3 }, MAINTENANT)).toEqual({ etat: 'absent' });
    expect(lireInstantane('texte', MAINTENANT)).toEqual({ etat: 'absent' });
  });

  it('plus vieux que 48 heures : « périmé », avec sa date', () => {
    expect(AGE_MAX_HEURES).toBe(48);
    const tard = new Date('2026-10-04T06:31:00Z');
    expect(lireInstantane(frais, tard)).toEqual({ etat: 'perime', instantane: frais });
    expect(lireInstantane(frais, new Date('2026-10-04T06:29:00Z')).etat).toBe('frais');
  });
});
