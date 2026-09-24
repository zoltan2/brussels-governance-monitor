// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Objets synthétiques uniquement : la CI lance les tests AVANT le build, `.velite/`
// n'existe pas encore à ce moment-là.
import { describe, expect, it } from 'vitest';
import { leadSplit } from './lead-split';
import {
  selectLatestHeadline,
  stripCorrectionPrefix,
  type LatestHeadlineInput,
  type TargetCardChange,
} from './latest-update-headline';

const CARTE: TargetCardChange = {
  title: 'Pauvreté : Bruxelles, la région-capitale la plus touchée de l’UE',
  changeSummary:
    'Le taux de pauvreté des régions-capitales est désormais comparé sur 2025. La fiche détaille ensuite la méthode et les sources, sur plusieurs phrases.',
  changeSummaryDate: '2026-09-24T00:00:00.000Z', // forme rendue par s.isodate()
  changeType: 'updated',
  isFallback: false,
};

const ENTREE: LatestHeadlineInput = {
  entryDate: '2026-09-24',
  entryType: 'updated',
  summary: undefined,
  description: 'Texte du changelog, plus long, qui sert de repli quand la fiche ne donne rien.',
  card: CARTE,
};

describe('selectLatestHeadline', () => {
  it('prend la première phrase du changeSummary, calculée par leadSplit', () => {
    const r = selectLatestHeadline(ENTREE);
    expect(r.source).toBe('changeSummary');
    expect(r.text).toBe('Le taux de pauvreté des régions-capitales est désormais comparé sur 2025.');
    expect(r.cardTitle).toBe(CARTE.title);
    expect(r.isCorrection).toBe(false);
  });

  it('retombe sur le summary du changelog, puis sur la description, sans fiche', () => {
    expect(selectLatestHeadline({ ...ENTREE, card: null }).text).toBe(ENTREE.description);
    const avecSummary = selectLatestHeadline({ ...ENTREE, card: null, summary: 'Résumé court.' });
    expect(avecSummary.text).toBe('Résumé court.');
    expect(avecSummary.source).toBe('changelog');
    expect(avecSummary.cardTitle).toBeNull();
  });

  it('retombe sur le changelog quand la fiche n’a pas de changeSummary', () => {
    const r = selectLatestHeadline({ ...ENTREE, card: { ...CARTE, changeSummary: '  ' } });
    expect(r.source).toBe('changelog');
    expect(r.text).toBe(ENTREE.description);
    // Le titre de la fiche reste disponible pour le nom accessible du lien.
    expect(r.cardTitle).toBe(CARTE.title);
  });

  it('refuse un changeSummary antérieur à l’entrée (il parle d’une autre veille)', () => {
    const r = selectLatestHeadline({ ...ENTREE, card: { ...CARTE, changeSummaryDate: '2026-09-10' } });
    expect(r.source).toBe('changelog');
  });

  it('refuse un changeSummary sans date', () => {
    const r = selectLatestHeadline({ ...ENTREE, card: { ...CARTE, changeSummaryDate: undefined } });
    expect(r.source).toBe('changelog');
  });

  it('refuse la fiche française servie en repli (texte dans la mauvaise langue)', () => {
    const r = selectLatestHeadline({ ...ENTREE, card: { ...CARTE, isFallback: true } });
    expect(r.source).toBe('changelog');
  });

  it('ne coupe jamais au milieu d’un mot quand la première phrase dépasse 120 caractères', () => {
    const long =
      'Une première phrase volontairement très longue qui décrit en détail la situation budgétaire des dix-neuf communes bruxelloises et de leurs CPAS sans jamais s’arrêter. Suite.';
    const r = selectLatestHeadline({ ...ENTREE, card: { ...CARTE, changeSummary: long } });
    expect(r.text).toBe(leadSplit(long).headline);
    expect(r.text.endsWith('…')).toBe(true);
    const sansEllipse = r.text.slice(0, -1);
    expect(long.startsWith(sansEllipse)).toBe(true);
    expect(long.charAt(sansEllipse.length)).toBe(' ');
  });

  it('suit leadSplit sur une date allemande « am 30. Juni » (même titre que l’email du digest)', () => {
    const de = 'Der Posten endete am 30. Juni 2026 ohne Nachfolger. Die Region sucht weiter.';
    const r = selectLatestHeadline({ ...ENTREE, card: { ...CARTE, changeSummary: de } });
    // Comportement actuel de leadSplit, assumé : la correction est éditoriale
    // (écrire « 30.06.2026 »), voir tech_leadsplit_date_allemande_coupe_le_titre.
    expect(r.text).toBe('Der Posten endete am 30.');
    expect(r.text).toBe(leadSplit(de).headline);
  });

  it('ignore digestHeadline : seule la première phrase du changeSummary compte', () => {
    const carte = { ...CARTE, digestHeadline: 'Manchette périmée' } as TargetCardChange;
    expect(selectLatestHeadline({ ...ENTREE, card: carte }).text).not.toBe('Manchette périmée');
  });
});

describe('correction', () => {
  it('signale une entrée de changelog de type corrected, même en repli', () => {
    const r = selectLatestHeadline({ ...ENTREE, entryType: 'corrected', card: null });
    expect(r.isCorrection).toBe(true);
  });

  it('signale une fiche changeType corrected quand son résumé est retenu', () => {
    const r = selectLatestHeadline({ ...ENTREE, card: { ...CARTE, changeType: 'corrected' } });
    expect(r.isCorrection).toBe(true);
  });

  it('ne se fie pas au changeType d’un résumé écarté comme ancien', () => {
    const r = selectLatestHeadline({
      ...ENTREE,
      card: { ...CARTE, changeType: 'corrected', changeSummaryDate: '2026-08-01' },
    });
    expect(r.isCorrection).toBe(false);
  });

  it('retire le préfixe « Correction : » que l’étiquette dit déjà, dans les quatre langues', () => {
    const cas: Array<[string, string]> = [
      ['Correction : sur le seul revenu, Vienne dépasse Bruxelles.', 'Sur le seul revenu, Vienne dépasse Bruxelles.'],
      ['Correctie: op het inkomen alleen ligt Wenen nu boven Brussel.', 'Op het inkomen alleen ligt Wenen nu boven Brussel.'],
      ['Correction: on income alone, Vienna is now above Brussels.', 'On income alone, Vienna is now above Brussels.'],
      ['Korrektur: Allein nach dem Einkommen liegt Wien vorn.', 'Allein nach dem Einkommen liegt Wien vorn.'],
    ];
    for (const [avant, apres] of cas) {
      const r = selectLatestHeadline({
        ...ENTREE,
        entryType: 'corrected',
        card: { ...CARTE, changeSummary: `${avant} Deuxième phrase.` },
      });
      expect(r.text).toBe(apres);
    }
  });

  it('garde le préfixe quand rien n’affiche l’étiquette', () => {
    const r = selectLatestHeadline({
      ...ENTREE,
      card: { ...CARTE, changeSummary: 'Correction : texte. Suite.' },
    });
    expect(r.isCorrection).toBe(false);
    expect(r.text).toBe('Correction : texte.');
  });

  it('stripCorrectionPrefix laisse intact un texte sans préfixe', () => {
    expect(stripCorrectionPrefix('Corrections budgétaires en vue.')).toBe('Corrections budgétaires en vue.');
  });
});
