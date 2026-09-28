// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTranslator } from 'next-intl';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import en from '../../messages/en.json';
import de from '../../messages/de.json';

/**
 * Textes de conformité et de traduction relevés par la revue de l'accueil du
 * 28/09/2026 (équipes white et km).
 */

const MESSAGES = { fr, nl, en, de } as const;
const LOCALES = ['fr', 'nl', 'en', 'de'] as const;

function cles(obj: unknown, prefixe = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefixe];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    cles(v, prefixe ? `${prefixe}.${k}` : k),
  );
}

// Espaces de noms touchés par ces correctifs. La parité n'est pas vérifiée sur
// tout le fichier : `quiz.podcast*` n'existe volontairement qu'en fr et nl (le
// podcast n'a pas de version en/de, voir bgm-quiz.tsx).
const ESPACES = ['accessibility', 'privacy', 'subscribe', 'home', 'support'] as const;

describe('parité des fichiers de messages', () => {
  it.each(ESPACES)('%s : les quatre langues déclarent exactement les mêmes clés', (espace) => {
    const reference = cles(fr[espace]).sort();
    expect(reference.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      expect(cles(MESSAGES[locale][espace]).sort(), locale).toEqual(reference);
    }
  });
});

describe("déclaration d'accessibilité : nombre de langues du digest", () => {
  it.each(LOCALES)('%s : le nombre vient du paramètre {count}, pas d\'un chiffre écrit', (locale) => {
    const texte = MESSAGES[locale].accessibility.linguisticText;
    expect(texte).toContain('{count}');
    // « plus de 80 langues » était faux : le site publie le digest en 11 langues.
    expect(texte).not.toMatch(/\b80\b/);
  });

  it.each(LOCALES)('%s : le message se formate avec {count} (aucune balise que le parseur ICU refuserait)', (locale) => {
    // Avec des valeurs, next-intl analyse le message : une balise « <html> » non
    // fermée le rendait invalide, et la page affichait la clé à la place du texte.
    const erreurs: string[] = [];
    const t = createTranslator({
      locale,
      messages: MESSAGES[locale],
      namespace: 'accessibility',
      onError: (e) => erreurs.push(e.code),
    });
    expect(t('linguisticText', { count: 97 })).toContain(' 97 ');
    expect(erreurs).toEqual([]);
  });

  it('la page passe bien un nombre calculé au message', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/[locale]/accessibility/page.tsx'),
      'utf8',
    );
    expect(source).toMatch(/t\('linguisticText', \{ count: getRecentDigestLangs\(/);
  });
});

describe('accueil : pas de français sur les pages nl, en et de', () => {
  it('la vignette Magazine passe par une clé traduite, pas « Semaine » écrit en dur', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/[locale]/page.tsx'), 'utf8');
    expect(source).not.toMatch(/^\s*Semaine \{weekNum\}/m);
    expect(source).toContain("t('protoMagazineWeek', { week: weekNum })");
  });

  it.each(LOCALES)('%s : home.protoMagazineWeek porte {week}', (locale) => {
    expect(MESSAGES[locale].home.protoMagazineWeek).toContain('{week}');
  });

  it.each(['nl', 'en', 'de'] as const)('%s : le libellé de semaine n\'est pas le français', (locale) => {
    expect(MESSAGES[locale].home.protoMagazineWeek).not.toMatch(/Semaine/);
  });

  it('nl : « een media » corrigé', () => {
    expect(nl.home.identityDetail).not.toMatch(/een media\b/);
  });
});
