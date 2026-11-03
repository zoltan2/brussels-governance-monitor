// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { corpsVide, estHtml, htmlPourMail, nettoyerCorps, texteSeul, texteVersHtml } from './corps';

describe('corps des coulisses', () => {
  it('texte brut ancien : paragraphes, retours simples en <br>, caractères échappés', () => {
    expect(texteVersHtml('Bonjour,\n\nLigne 1\nLigne 2 <b>\n\n')).toBe('<p>Bonjour,</p><p>Ligne 1<br>Ligne 2 &lt;b&gt;</p>');
    expect(estHtml('Bonjour')).toBe(false);
    expect(estHtml('<p>Bonjour</p>')).toBe(true);
  });

  it("garde ce que l'éditeur produit, retire le reste", () => {
    const sale = '<h1>T</h1><p style="color:red" class="x"><b>g</b> <i>i</i> <u>u</u></p><img src="x"><iframe></iframe><p></p>';
    expect(nettoyerCorps(sale)).toBe('<h2>T</h2><p><strong>g</strong> <em>i</em> u</p>');
  });

  it('liens : https, http et mailto seulement ; ni target ni rel ajoutés', () => {
    expect(nettoyerCorps('<p><a href="https://a.be" target="_blank" rel="x">a</a></p>')).toBe('<p><a href="https://a.be">a</a></p>');
    expect(nettoyerCorps('<p><a href="mailto:contact@brusselsgovernance.be">m</a></p>')).toContain('href="mailto:');
    expect(nettoyerCorps('<p><a href="javascript:alert(1)">j</a></p>')).toBe('<p><a>j</a></p>');
    expect(nettoyerCorps('<p><a href="//evil.example">p</a></p>')).toBe('<p><a>p</a></p>');
  });

  it('style en ligne sur chaque balise du mail, jamais sur ce que le nettoyage a retiré', () => {
    const h = htmlPourMail('<h2>T</h2><p>x <a href="https://a.be">a</a></p><ul><li>l</li></ul>');
    for (const b of ['h2', 'p', 'a', 'ul', 'li']) expect(h).toMatch(new RegExp(`<${b}[^>]* style="[^"]+"`));
    expect(htmlPourMail('<p style="display:none">x</p>')).not.toContain('display:none');
  });

  it('corps vide : éditeur vide ou espaces seulement', () => {
    expect(corpsVide('<p></p>')).toBe(true);
    expect(corpsVide('  ')).toBe(true);
    expect(corpsVide('<p>x</p>')).toBe(false);
    expect(texteSeul('<h2>A</h2><p>b<br>c</p>')).toBe('A b c');
  });
});
