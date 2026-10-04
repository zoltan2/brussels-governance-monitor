import { describe, it, expect } from 'vitest';
import { validateMagazine } from '../validate';
import type { Magazine, MagazineItem } from '../types';

// Gabarit v2 du magazine (maquette de Zoltán du 27/09/2026) : chaque sujet porte
// un chapeau, une nuance titrée, un niveau de confiance et ses sources.

function item(over: Partial<MagazineItem> = {}): MagazineItem {
  return {
    category: 'Budget · Région',
    short: 'Fiscalité',
    headline: '43 % des déclarations sans IPP dû.',
    lead: 'Le chiffre porte sur des déclarations fiscales. Pas sur la part des Bruxellois qui ne paient aucun impôt.',
    path: '/fr/domaines/budget',
    stat: '43 %',
    stat_label: 'des déclarations bruxelloises, revenus 2023',
    facts: ['339 881 déclarations sur 791 621', 'contre 35 % pour les revenus 2014'],
    description: 'Selon une analyse de l’IBSA réalisée pour BRUZZ et publiée le 24 septembre, 43 % des déclarations bruxelloises n’aboutissent à aucun impôt dû pour les revenus 2023.',
    nuance_title: 'Une déclaration n’est pas une personne',
    howto: 'Un couple qui déclare ensemble ne remplit qu’une déclaration. Ce chiffre ne mesure donc ni une proportion d’habitants, ni l’ensemble des contributions fiscales.',
    confidence: 'estimated',
    status: 'Analyse rapportée par BRUZZ',
    sources: [
      { label: 'BRUZZ, 24 septembre 2026', url: 'https://www.bruzz.be/actua/economie/x-2026-09-24', kind: 'secondaire', note: 'analyse IBSA commandée par le média' },
    ],
    ...over,
  };
}

function magazine(over: Partial<Magazine> = {}, items: MagazineItem[] = [item(), item({ short: 'Deux' }), item({ short: 'Trois' })]): Magazine {
  return {
    version: 2,
    tagline: 'Trois sujets.',
    closing_line: 'Retour lundi prochain.',
    period: '21 au 27 septembre 2026',
    consulted: '2026-09-27',
    items,
    ...over,
  };
}

const fields = (errors: { field: string }[]) => errors.map((e) => e.field);

describe('validateMagazine, gabarit v2', () => {
  it('accepte un magazine v2 complet', () => {
    expect(validateMagazine(magazine())).toEqual([]);
  });

  it('exige la période et la date de consultation des références', () => {
    expect(fields(validateMagazine(magazine({ period: undefined })))).toContain('period');
    expect(fields(validateMagazine(magazine({ consulted: '27/09/2026' })))).toContain('consulted');
  });

  it('exige un titre de nuance par sujet, de 80 caractères au plus', () => {
    expect(fields(validateMagazine(magazine({}, [item({ nuance_title: undefined }), item(), item()])))).toContain('nuance_title');
    expect(fields(validateMagazine(magazine({}, [item({ nuance_title: 'x'.repeat(81) }), item(), item()])))).toContain('nuance_title');
  });

  it('exige un niveau de confiance parmi official, estimated, unconfirmed', () => {
    expect(fields(validateMagazine(magazine({}, [item({ confidence: undefined }), item(), item()])))).toContain('confidence');
    expect(fields(validateMagazine(magazine({}, [item({ confidence: 'sure' as never }), item(), item()])))).toContain('confidence');
  });

  it('exige au moins une source par sujet, avec une URL http(s) et un type connu', () => {
    expect(fields(validateMagazine(magazine({}, [item({ sources: [] }), item(), item()])))).toContain('sources');
    expect(fields(validateMagazine(magazine({}, [item({ sources: [{ label: 'x', url: 'bruzz.be/a', kind: 'secondaire' }] }), item(), item()])))).toContain('sources');
    expect(fields(validateMagazine(magazine({}, [item({ sources: [{ label: 'x', url: 'https://bruzz.be/a', kind: 'blog' as never }] }), item(), item()])))).toContain('sources');
  });

  it('borne les repères à deux et la couverture à trois sujets', () => {
    expect(fields(validateMagazine(magazine({}, [item({ facts: ['a', 'b', 'c'] }), item(), item()])))).toContain('facts');
    const four = [item({ cover: true }), item({ cover: true }), item({ cover: true }), item({ cover: true })];
    expect(fields(validateMagazine(magazine({}, four)))).toContain('cover');
  });

  it('laisse passer un magazine v1 sans les champs v2', () => {
    const v1: Magazine = {
      tagline: 'Trois sujets.',
      closing_line: 'Retour lundi.',
      items: [1, 2, 3].map((n) => ({
        headline: `Sujet ${n}.`,
        stat: '100',
        stat_label: 'label',
        description: 'Description assez longue pour passer la règle des cent caractères du gabarit v1, sans rien d’autre à dire.',
        howto: 'Mode d’emploi assez long pour passer la règle des quatre-vingts caractères du gabarit v1.',
      })),
    };
    expect(validateMagazine(v1)).toEqual([]);
  });
});
