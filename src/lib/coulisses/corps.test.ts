// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { assemblerBienvenue, contientRepereSondage, marquerLiens, corpsVide, estHtml, htmlPourMail, nettoyerCorps, texteSeul, texteVersHtml } from './corps';

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

describe('HTML collé qui commence par une balise en ligne', () => {
  it('reste du HTML (pas de balises visibles dans le mail)', () => {
    expect(nettoyerCorps('<b>Gras</b> puis <a href="https://a.be">lien</a>')).toBe('<strong>Gras</strong> puis <a href="https://a.be">lien</a>');
    expect(estHtml('<!-- x --><p>a</p>')).toBe(true);
    expect(estHtml('a < b et c > d')).toBe(false);
    expect(estHtml('<3 merci')).toBe(false);
  });
});

describe('marquerLiens', () => {
  const SITE = 'https://governance.brussels';
  const U = { campagne: '2026-12', contenu: 'bienvenue' };
  const href = (html: string) => /href="([^"]*)"/.exec(html)?.[1]?.replace(/&amp;/g, '&');

  it('ajoute les UTM aux liens du site, ancre et paramètres existants gardés', () => {
    const h = href(marquerLiens('<p><a href="https://governance.brussels/fr/soutenir?x=1#don">soutenir</a></p>', SITE, U));
    expect(h).toBe(
      'https://governance.brussels/fr/soutenir?x=1&utm_source=bgm-coulisses&utm_medium=email&utm_campaign=2026-12&utm_content=bienvenue#don',
    );
  });

  it('traite www. comme le même site', () => {
    expect(href(marquerLiens('<p><a href="https://www.governance.brussels/nl/enquete">x</a></p>', SITE, U))).toContain('utm_source=bgm-coulisses');
  });

  it('laisse intacts les autres sites, les mailto et les liens déjà marqués', () => {
    for (const lien of [
      'https://www.linkedin.com/in/x',
      'mailto:contact@brusselsgovernance.be',
      'https://governance.brussels/fr?utm_source=autre',
      'https://governance.brussels.evil.example/fr',
    ]) {
      expect(href(marquerLiens(`<p><a href="${lien}">x</a></p>`, SITE, U))).toBe(lien);
    }
  });

  it('garde le texte et les autres balises', () => {
    const html = marquerLiens('<p>Bonjour <strong>vous</strong>, <a href="https://governance.brussels/fr">ici</a>.</p>', SITE, U);
    expect(html).toContain('<strong>vous</strong>');
    expect(html).toContain('>ici</a>.');
  });
});

// Essai du 17/11/2026 : le repère avait été mis en titre dans l'éditeur
// (<h2>[sondage]</h2>) et partait tel quel, sans le bloc sondage.
describe('repère [sondage] de la bienvenue', () => {
  const BLOC = '<p>Un <a href="https://governance.brussels/fr/sondage">sondage</a> est en cours.</p>';

  it('remplace le repère, en paragraphe comme en titre', () => {
    for (const balise of ['p', 'h2', 'h3']) {
      const corps = `<p>Avant.</p><${balise}> [sondage] </${balise}><h2>Après</h2>`;
      expect(contientRepereSondage(corps)).toBe(true);
      const html = assemblerBienvenue(corps, BLOC, true);
      expect(html).not.toContain('[sondage]');
      expect(html).toContain('/fr/sondage');
    }
  });

  it('retire le repère sans bloc quand le sondage est clos', () => {
    const html = assemblerBienvenue('<p>a</p><h2>[sondage]</h2><p>b</p>', BLOC, false);
    expect(html).not.toContain('[sondage]');
    expect(html).not.toContain('/fr/sondage');
  });

  it('ne prend pas pour repère un [sondage] cité dans une phrase', () => {
    expect(contientRepereSondage('<p>Le repère [sondage] sert à ça.</p>')).toBe(false);
  });
});
