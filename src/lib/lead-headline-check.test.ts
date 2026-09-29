// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { leadHeadlineProblem, localeOfCardFile } from './lead-headline-check';

// Textes recopiés des fiches en ligne le 28/09/2026 (fixtures : les fiches
// elles-mêmes sont corrigées par un autre chantier).
const UCCLE_DE =
  'Das Gericht hat am 19. August die Einrichtung des Aufnahmezentrums in der Rue Beeckman genehmigt. Der Eilrichter hob die beiden seit dem 12. Juli von Anwohnerkollektiven erwirkten Aussetzungen auf.';
const FOIRE_DE =
  'Erstes BGM-Dossier zur Foire du Midi (146. Ausgabe, 2026): ausschließlich kommunale Organisation, keine öffentlichen Daten zur Finanzierung.';

describe('leadHeadlineProblem', () => {
  it('refuse le titre allemand coupé sur la date (uccle.de, en ligne le 28/09)', () => {
    expect(leadHeadlineProblem(UCCLE_DE, 'de')).toContain('date allemande');
  });

  it('refuse le titre coupé dans une parenthèse (foire-du-midi.de, en ligne le 28/09)', () => {
    expect(leadHeadlineProblem(FOIRE_DE, 'de')).toContain('parenthèse');
  });

  it('refuse une première phrase de plus de 120 caractères, tronquée avec « … »', () => {
    const long = `${'La commune annonce un plan de rénovation des écoles communales '.repeat(3)}fin.`;
    expect(leadHeadlineProblem(long, 'fr')).toContain('tronqué');
  });

  it('accepte une date allemande écrite sans ordinal en tête (forme du changelog)', () => {
    expect(
      leadHeadlineProblem('Das Gericht hat am 19.08.2026 das Aufnahmezentrum genehmigt. Der Eilrichter hob die Aussetzungen auf.', 'de'),
    ).toBeNull();
  });

  it("n'accuse pas une phrase allemande qui finit vraiment sur un nombre", () => {
    expect(leadHeadlineProblem('Korrektur: 2024 arbeiteten rund 400 000 Pendler in Brüssel, nicht 360 000. Die Zahl stammt von Statbel.', 'de')).toBeNull();
    expect(leadHeadlineProblem('Die Zahl der Plätze steigt auf 62. Die Gemeinde bestätigt.', 'de')).toBeNull();
    // Nombre groupé suivi d'un mois : ce n'est pas un ordinal de date.
    expect(leadHeadlineProblem('Die Zahl der Pendler stieg auf 360 000. September brachte einen Rückgang.', 'de')).toBeNull();
  });

  it("n'applique la règle de l'ordinal qu'à l'allemand", () => {
    expect(leadHeadlineProblem('Le nombre de places passe à 19. août reste la date butoir.', 'fr')).toBeNull();
  });

  it('accepte une première phrase courte et complète', () => {
    expect(leadHeadlineProblem('Le tribunal autorise le centre de la rue Beeckman. Suite du texte.', 'fr')).toBeNull();
  });

  it("ne dit rien d'un résumé vide", () => {
    expect(leadHeadlineProblem(undefined, 'fr')).toBeNull();
    expect(leadHeadlineProblem('   ', 'de')).toBeNull();
  });

  it('lit la langue dans le nom de fichier', () => {
    expect(localeOfCardFile('content/commune-cards/uccle.de.mdx')).toBe('de');
    expect(localeOfCardFile('content/commune-cards/uccle.mdx')).toBeUndefined();
  });
});
