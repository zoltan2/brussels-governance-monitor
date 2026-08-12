// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { safeCallbackPath } from './safe-callback';

describe('safeCallbackPath', () => {
  it('accepte un chemin interne', () => {
    expect(safeCallbackPath('/fr/admin/content/395', 'fr')).toBe('/fr/admin/content/395');
  });

  it('retombe sur le tableau de bord quand rien n\'est fourni', () => {
    expect(safeCallbackPath(null, 'fr')).toBe('/fr/admin');
    expect(safeCallbackPath(undefined, 'nl')).toBe('/nl/admin');
    expect(safeCallbackPath('', 'fr')).toBe('/fr/admin');
  });

  it('refuse une URL absolue', () => {
    expect(safeCallbackPath('https://evil.example/x', 'fr')).toBe('/fr/admin');
  });

  it('refuse une URL relative au protocole', () => {
    expect(safeCallbackPath('//evil.example/x', 'fr')).toBe('/fr/admin');
  });

  it('refuse la contre-oblique, que certains navigateurs traitent comme une oblique', () => {
    expect(safeCallbackPath('/\\evil.example', 'fr')).toBe('/fr/admin');
    expect(safeCallbackPath('\\\\evil.example', 'fr')).toBe('/fr/admin');
  });

  it('refuse un saut de ligne', () => {
    expect(safeCallbackPath('/fr/admin\r\nSet-Cookie: a=b', 'fr')).toBe('/fr/admin');
  });

  it('laisse passer une oblique encodée, qui reste un chemin interne', () => {
    // Le parseur d'URL ne décode PAS `%2f`, et les navigateurs non plus :
    // `/%2f%2fevil.example` reste un chemin de ce site. Une version
    // antérieure de ce test exigeait un refus — le test était faux, pas le
    // code.
    expect(safeCallbackPath('/%2f%2fevil.example', 'fr')).toBe(
      '/%2f%2fevil.example',
    );
  });

  // Le parseur d'URL du WHATWG supprime la TABULATION en plus de CR et LF.
  // Un filtre sur [\r\n] seul laissait donc passer une redirection ouverte,
  // démontrée de bout en bout : `/⇥//evil.example` résolvait sur evil.example.
  it('refuse la tabulation, que le parseur d\'URL supprime avant d\'analyser', () => {
    expect(safeCallbackPath('/\t//evil.example/x', 'fr')).toBe('/fr/admin');
    expect(safeCallbackPath('/\t/evil.example/x', 'fr')).toBe('/fr/admin');
  });

  it('refuse les autres caractères de contrôle', () => {
    const nul = String.fromCharCode(0);
    const del = String.fromCharCode(127);
    expect(safeCallbackPath(`/fr/admin${nul}`, 'fr')).toBe('/fr/admin');
    expect(safeCallbackPath(`/fr/admin${del}`, 'fr')).toBe('/fr/admin');
  });

  // Le contrôle d'origine ne suffit pas : le parseur normalise `..`, et le
  // chemin résultant peut commencer par `//`, donc être relatif au protocole.
  // Trois charges utiles sur trois sortaient de l'origine avant ce correctif.
  it('refuse un chemin qui redevient relatif au protocole après normalisation', () => {
    expect(safeCallbackPath('/..//evil.example', 'fr')).toBe('/fr/admin');
    expect(safeCallbackPath('/%2e%2e//evil.example', 'fr')).toBe('/fr/admin');
    expect(safeCallbackPath('/fr/admin/../..//evil.example', 'fr')).toBe('/fr/admin');
  });

  it('conserve la chaîne de requête d\'un chemin interne', () => {
    expect(safeCallbackPath('/fr/admin/content/395?x=1', 'fr')).toBe(
      '/fr/admin/content/395?x=1',
    );
  });
});
