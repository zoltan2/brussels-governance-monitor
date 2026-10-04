import { describe, it, expect, afterEach } from 'vitest';
import { renderMagazine } from '../render';
import { renderMagazineV2 } from '../render-v2';
import type { MagazineDraft, MagazineItem } from '../types';

// Gabarit v2 (maquette du 27/09/2026) avec les corrections actées : palette du
// site, vouvoiement, Umami, Open Graph et canonique, statut tiré du niveau de
// confiance, sources par sujet, nuance titrée, « Comment lire » pour le lecteur.

function item(n: number, over: Partial<MagazineItem> = {}): MagazineItem {
  return {
    category: `Catégorie ${n} · Région`,
    short: `Court ${n}`,
    headline: `Titre du sujet ${n}.`,
    lead: `Chapeau du sujet ${n}, deux phrases au plus.`,
    path: '/fr/domaines/budget',
    stat: `${n}0 %`,
    stat_label: `libellé du chiffre ${n}`,
    facts: [`repère un du sujet ${n}`, `repère deux du sujet ${n}`],
    description: `Corps du sujet ${n}, assez long pour ressembler à un vrai paragraphe de magazine, avec une date et une source nommée dans le texte.`,
    nuance_title: `La nuance du sujet ${n}`,
    howto: `Texte de la nuance du sujet ${n}, qui dit ce que le chiffre ne mesure pas et comment le lire sans se tromper.`,
    confidence: n === 1 ? 'official' : n === 2 ? 'estimated' : 'unconfirmed',
    status: n === 1 ? 'Statistique publiée' : undefined,
    sources: [{ label: `Source ${n}`, url: `https://source.example/${n}`, kind: n === 1 ? 'primaire' : 'secondaire', note: 'précision' }],
    cover: n <= 3,
    ...over,
  };
}

function draft(): MagazineDraft {
  return {
    week: '2026-w39',
    weekShort: 's39',
    lang: 'fr',
    title: 'Digest BGM — Semaine 39 (21-27 septembre 2026)',
    generated_at: '2026-09-27',
    magazine: {
      version: 2,
      tagline: 'Six sujets, et ce que les chiffres ne disent pas.',
      closing_line: 'Retour lundi prochain.',
      period: '21 au 27 septembre 2026',
      consulted: '2026-09-27',
      items: [1, 2, 3, 4, 5, 6].map((n) => item(n)),
    },
  };
}

afterEach(() => {
  delete process.env.UMAMI_WEBSITE_ID;
});

describe('renderMagazineV2', () => {
  const html = renderMagazineV2(draft());

  it('est une page française avec un seul h1, une canonique et des balises Open Graph', () => {
    expect(html).toContain('<html lang="fr">');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain('<link rel="canonical" href="https://magazine.governance.brussels/s39/" />');
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('<meta property="og:url" content="https://magazine.governance.brussels/s39/" />');
    expect(html).toContain('<meta name="description"');
  });

  it('ouvre sur la couverture, la période et le sommaire des six sujets', () => {
    expect(html).toContain('21 au 27 septembre 2026');
    expect(html).toContain('Six sujets');
    const toc = html.slice(html.indexOf('id="sommaire"'));
    for (let n = 1; n <= 6; n++) expect(toc).toContain(`Court ${n}`);
    expect((html.match(/class="toc-link"/g) ?? []).length).toBe(6);
  });

  it('donne du rythme : couverture en deux colonnes, panneau du chiffre inversé sur les feuilles claires', () => {
    // Retour de Zoltán du 04/10/2026 : « travaille la couverture et l’alternance des couleurs ».
    expect(html).toContain('class="inner cover-grid"');
    expect(html).toContain('class="cover-issue"');
    const first = html.slice(html.indexOf('id="sujet-01-'), html.indexOf('id="sujet-02-'));
    const second = html.slice(html.indexOf('id="sujet-02-'), html.indexOf('id="sujet-03-'));
    expect(first).toContain('class="stat-panel inverse"');
    expect(second).toContain('class="stat-panel"');
    expect(first).toContain('<span class="rank-mark" aria-hidden="true">01</span>');
  });

  it('met en couverture les trois sujets marqués, pas les autres', () => {
    const cover = html.slice(html.indexOf('class="cover-numbers"'), html.indexOf('id="sommaire"'));
    expect(cover).toContain('10 %');
    expect(cover).toContain('30 %');
    expect(cover).not.toContain('40 %');
  });

  it('rend pour chaque sujet le chapeau, la nuance titrée et les repères', () => {
    expect(html).toContain('Chapeau du sujet 4');
    expect(html).toContain('<h3 class="nuance-title">La nuance du sujet 4</h3>');
    expect(html).toContain('repère deux du sujet 4');
  });

  it('ne montre ni source, ni lien vers un média, ni précision de statut : la porte d’entrée, c’est le site', () => {
    // Décision de Zoltán du 04/10/2026 : le magazine renvoie au site, où vivent les sources.
    expect(html).not.toContain('Sources et périmètre');
    expect(html).not.toContain('source.example');
    expect(html).not.toContain('Références consultées');
    expect(html).not.toContain('Statistique publiée');
    expect(html).not.toMatch(/Source (primaire|secondaire|tierce)/);
  });

  it('affiche un statut sobre tiré du niveau de confiance de la fiche', () => {
    expect(html).toContain('Donnée officielle');
    expect(html).toContain('Estimation');
    expect(html).toContain('À confirmer');
    expect(html).not.toContain('presse');
  });

  it('se termine par la carte de visite et « À lundi prochain »', () => {
    expect(html).toContain('Zoltán Jánosi');
    expect(html).toContain('Mon métier consiste à rendre lisible');
    expect(html).toContain('Édité par Advice That SRL');
    expect(html).toContain('contact@brusselsgovernance.be');
    expect(html).toContain('À lundi prochain.');
    // Demande de Zoltán du 04/10/2026 : « Recevoir le digest » mène à l'abonnement.
    expect(html).toContain('href="https://governance.brussels/fr/subscribe">Recevoir le digest</a>');
    expect(html).not.toContain('/fr/digest"');
    expect(html.indexOf('Mon métier consiste')).toBeGreaterThan(html.indexOf('id="comment-lire"'));
  });

  it('vouvoie le lecteur et s’adresse à lui dans « Comment lire »', () => {
    expect(html).toContain('Choisissez');
    expect(html).not.toMatch(/\bChoisis ton\b/);
    expect(html).toContain('Comment lire');
    expect(html).not.toMatch(/citez-la/i);
  });

  it('utilise la palette du site et aucun tiret cadratin dans ses propres textes', () => {
    expect(html).not.toContain('#9a3c28');
    expect(html).not.toContain('#26392e');
    expect(html).not.toContain('—');
  });

  it('relie chaque sujet à sa fiche sur le site et porte la mesure Umami quand elle est réglée', () => {
    expect(html).toContain('href="https://governance.brussels/fr/domaines/budget"');
    process.env.UMAMI_WEBSITE_ID = 'abc';
    expect(renderMagazineV2(draft())).toContain('data-website-id="abc"');
  });
});

describe('renderMagazine aiguille vers le gabarit v2', () => {
  it('rend le gabarit v2 quand le bloc porte version: 2, l’ancien sinon', () => {
    const d = draft();
    expect(renderMagazine(d)).toBe(renderMagazineV2(d));
    const v1 = { ...d, magazine: { ...d.magazine!, version: undefined } };
    expect(renderMagazine(v1)).not.toContain('id="sommaire"');
  });
});
