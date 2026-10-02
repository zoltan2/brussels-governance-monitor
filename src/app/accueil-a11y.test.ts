// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Garde-fous des correctifs d'accessibilité et de mise en page de l'accueil
 * (revue multi-équipes du 28/09/2026, équipe Design).
 *
 * La page d'accueil est un composant serveur asynchrone nourri par Velite : on
 * ne la rend pas en test. On vérifie donc le balisage dans la source, élément par
 * élément (jamais un simple `includes` sur tout le fichier, qu'une autre ligne
 * satisferait). Les mesures réelles (hauteurs, cibles, recouvrement) sont dans la
 * PR, prises sur un build local.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const page = readFileSync(resolve(__dirname, '[locale]/page.tsx'), 'utf8');
const footer = readFileSync(resolve(__dirname, '../components/layout/footer.tsx'), 'utf8');
const css = readFileSync(resolve(__dirname, 'globals.css'), 'utf8');

/** Source d'une fonction du fichier, de sa déclaration à la suivante. */
function fonction(nom: string): string {
  const start = page.indexOf(`function ${nom}(`);
  if (start === -1) throw new Error(`function ${nom} introuvable dans page.tsx`);
  const next = page.indexOf('\nfunction ', start + 1);
  return page.slice(start, next === -1 ? undefined : next);
}

/** Classes Tailwind d'une chaîne `className="…"` ou d'un littéral. */
const classes = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

describe('pastilles de langue du digest — WCAG 2.5.8 (24 × 24 px)', () => {
  const m = fonction('FormatsSection').match(/const pastille =\s*'([^']+)'/);

  it('la classe commune des pastilles impose 24 px de haut et de large', () => {
    expect(m, 'const pastille introuvable').not.toBeNull();
    const c = classes(m![1]);
    expect(c.has('min-h-6'), m![1]).toBe(true);
    expect(c.has('min-w-6'), m![1]).toBe(true);
    // `min-h` n'agit sur un élément en ligne que s'il devient une boîte.
    expect(c.has('inline-flex'), m![1]).toBe(true);
  });

  it('la vignette du digest est assez haute pour trois rangées sans défilement sous lg', () => {
    const tall = page.match(/const FORMAT_VISUAL_TALL = '([^']+)'/);
    expect(tall).not.toBeNull();
    // 3 rangées × 24 px + 2 écarts × 4 px + 12 px de marge (py-1.5) = 92 px ≤ 96 px (h-24).
    expect(classes(tall![1]).has('h-24')).toBe(true);
    const digestCard = fonction('FormatsSection').split("title={t('protoDigestName')}")[1]?.split('visual=')[0] ?? '';
    expect(digestCard).toContain('visualClassName={FORMAT_VISUAL_TALL}');
  });
});

describe('domaines : chapeau coupé sur mobile, entier sur desktop', () => {
  it('le <p> du chapeau porte line-clamp-2 et md:line-clamp-none', () => {
    const src = fonction('DomainsPreview');
    const p = src.match(/<p className="([^"]+)">\s*\{card\.summary\}/);
    expect(p, '<p> du chapeau introuvable').not.toBeNull();
    const c = classes(p![1]);
    expect(c.has('line-clamp-2')).toBe(true);
    expect(c.has('md:line-clamp-none')).toBe(true);
  });
});

// Longueur mobile (revue du 28/09/2026, P2 « la page fait 9 430 px ») : trois cartes
// par inventaire tant que la grille n'a qu'une colonne. Mesure locale à 390 px dans la
// PR : 8 878 px avant, sous 7 000 après.
describe('inventaires : trois cartes sur mobile, toutes dès que la grille a deux colonnes', () => {
  it('MOBILE_CARDS vaut 3', () => {
    expect(page).toMatch(/^const MOBILE_CARDS = 3;$/m);
  });

  // Le masquage doit tomber au MÊME point de rupture que la deuxième colonne de la
  // grille : plus tôt, il cacherait des cartes à deux colonnes ; plus tard, il en
  // laisserait une seule sur une rangée de deux.
  for (const [nom, section, bp] of [
    ['DossiersPreview', 'dossiers', 'md'],
    ['DomainsPreview', 'domains', 'md'],
    ['SectorsPreview', 'sectors', 'sm'],
  ] as const) {
    describe(nom, () => {
      const src = fonction(nom);

      it(`masque les cartes au-delà de la 3e sous ${bp} seulement`, () => {
        const m = src.match(/className=\{cn\(cardClass, i >= MOBILE_CARDS && '([^']+)'\)\}/);
        expect(m, 'masquage responsive des cartes introuvable').not.toBeNull();
        expect(m![1]).toBe(`max-${bp}:hidden`);
      });

      it(`la grille passe à deux colonnes à ${bp}`, () => {
        const grid = src.match(/<div className="(grid [^"]+)">\s*\{cards\.map/);
        expect(grid, 'grille des cartes introuvable').not.toBeNull();
        expect(classes(grid![1]).has(`${bp}:grid-cols-2`)).toBe(true);
      });

      it('garde un lien vers la liste complète en tête de section', () => {
        const link = src.match(/link=\{<MoreLink href="([^"]+)">/);
        expect(link, 'MoreLink introuvable').not.toBeNull();
        expect(link![1]).toBe(`/${section}`);
      });

      it('rend toujours toutes les cartes dans le HTML (pas de slice pour le mobile)', () => {
        expect(src).toMatch(/\{cards\.map\(\(card, i\) =>/);
        expect(src).not.toMatch(/cards\.slice\(/);
      });
    });
  }
});

describe('chiffre clé : source masquée à l’œil sur mobile, toujours lue', () => {
  it('le <p> de la source porte max-md:sr-only, jamais hidden', () => {
    const src = fonction('KeyFigure');
    const p = src.match(/<p className="([^"]+)">\s*\{t\('keyFigureSource'/);
    expect(p, '<p> de la source introuvable').not.toBeNull();
    const c = classes(p![1]);
    expect(c.has('max-md:sr-only')).toBe(true);
    expect([...c].some((x) => /(^|:)hidden$/.test(x))).toBe(false);
  });
});

describe('pied de page : trois colonnes dès 360 px, desktop inchangé', () => {
  it('grille à 3 colonnes à partir de 360 px, écart de 32 px à partir de sm', () => {
    const grid = footer.match(/<div className="(grid [^"]+)">\s*\{\/\* Column 1/);
    expect(grid, 'grille des colonnes du pied de page introuvable').not.toBeNull();
    const c = classes(grid![1]);
    expect(c.has('min-[360px]:grid-cols-3')).toBe(true);
    expect(c.has('sm:gap-8')).toBe(true);
  });
});

describe('magazine : langue annoncée avant le clic', () => {
  const lien = (() => {
    const src = fonction('FormatsSection');
    const i = src.indexOf('event="accueil-magazine"');
    return src.slice(i, src.indexOf('</a>', i));
  })();

  it('le lien déclare hrefLang="fr"', () => {
    expect(lien).toMatch(/hrefLang="fr"/);
  });

  it('hors fr, le libellé porte la marque « (FR) »', () => {
    expect(lien).toMatch(/locale !== 'fr' && <FrenchOnlyMark \/>/);
    expect(fonction('FrenchOnlyMark')).toContain('(FR)');
  });
});

describe('boutons flottants : rien de masqué à l’ouverture sur mobile', () => {
  // Les trois éléments fixes de la mise en page. Chacun pose la classe de masquage
  // sur l'élément `fixed` lui-même, tant que le lecteur n'a ni défilé ni tabulé
  // (comportement du crochet : use-reveal-on-scroll.render.test.tsx).
  for (const [fichier, fixe] of [
    ['chat-widget.tsx', 'fixed bottom-4 left-4 z-[9999] flex h-14 w-14'],
    ['games-panel.tsx', 'group fixed left-0 top-1/2'],
    ['accessibility-toolbar.tsx', 'fixed bottom-4 end-4 z-50'],
  ] as const) {
    it(`${fichier} : l'élément fixe attend le premier geste`, () => {
      const src = readFileSync(resolve(__dirname, '../components', fichier), 'utf8');
      expect(src).toMatch(/const revealed = useRevealOnScroll\(\);/);
      const i = src.indexOf(fixe);
      expect(i, `élément fixe « ${fixe} » introuvable`).toBeGreaterThan(-1);
      const cls = src.slice(i, src.indexOf('`', i));
      expect(cls).toContain("${revealed ? '' : HIDDEN_UNTIL_SCROLL}");
    });
  }
});

describe('boutons flottants sur mobile — WCAG 2.4.11', () => {
  it('scroll-padding-bottom ≥ 72 px (bouton de 56 px + 16 px de marge), sous 768 px', () => {
    const bloc = css.match(/@media \(max-width: 767px\) \{\s*html \{\s*scroll-padding-bottom:\s*([\d.]+)rem;/);
    expect(bloc, 'bloc html { scroll-padding-bottom } introuvable dans @media (max-width: 767px)').not.toBeNull();
    expect(Number(bloc![1]) * 16).toBeGreaterThanOrEqual(72);
  });

  it('le pied de page garde une marge basse de 96 px sur mobile, inchangée sur desktop', () => {
    const div = footer.match(/<footer[^>]*>\s*<div className="([^"]+)"/);
    expect(div).not.toBeNull();
    const c = classes(div![1]);
    expect(c.has('pb-24')).toBe(true);
    expect(c.has('md:py-10')).toBe(true);
  });
});

/**
 * Lot 2 de l'abonnement (02/10/2026) : la carte du digest ne menait à
 * l'inscription que s'il n'existait AUCUN digest, donc jamais. Elle porte
 * maintenant deux liens : lire le digest de la semaine, et le recevoir par email.
 */
describe('carte du digest : une seconde porte vers l’inscription', () => {
  const carte = fonction('FormatsSection').split("title={t('protoDigestName')}")[1]?.split("title={t('protoMagazineName')}")[0] ?? '';
  const lien = carte.split('link={')[1] ?? '';
  const ancres = [...lien.matchAll(/<TrackedAnchor\b([\s\S]*?)>/g)].map((m) => m[1]);

  it('témoin : la carte et sa propriété link sont bien lues', () => {
    expect(carte.length).toBeGreaterThan(500);
    expect(ancres.length).toBeGreaterThanOrEqual(2);
  });

  it('le lien vers le digest de la semaine reste le lien étiré de la carte', () => {
    const lire = ancres.find((a) => a.includes('event="accueil-digest"'));
    expect(lire, 'lien accueil-digest introuvable').toBeDefined();
    expect(lire).toContain('href={digest.href}');
    expect(lire).toContain('className={stretchedLink}');
  });

  it('le lien « recevoir par email » est rendu quand un digest existe, vers #subscribe', () => {
    const recevoir = ancres.filter((a) => a.includes('event="accueil-digest-abonnement"'));
    expect(recevoir).toHaveLength(1);
    expect(recevoir[0]).toContain('href="#subscribe"');
    // Rendu hors de toute branche « pas de digest » : il n'est dans aucun `: (`.
    const avant = lien.slice(0, lien.indexOf('event="accueil-digest-abonnement"'));
    expect(avant.lastIndexOf(') : (')).toBe(-1);
    expect(lien).toContain("t('protoDigestByEmail')");
  });

  it('il passe au-dessus du lien étiré et offre une cible de 24 px', () => {
    const recevoir = ancres.find((a) => a.includes('event="accueil-digest-abonnement"'))!;
    const c = recevoir.match(/className=\{([^}]+)\}/)?.[1] ?? '';
    expect(c).toContain('digestEmailLink');
    const def = page.match(/const digestEmailLink =\s*`([^`]+)`/)?.[1] ?? '';
    const cls = classes(def.replace('${linkClass}', ''));
    expect(cls.has('relative')).toBe(true);
    expect(cls.has('z-10')).toBe(true);
    expect(cls.has('min-h-6')).toBe(true);
    // Sans pseudo-élément étiré : sinon il recouvrirait le lien de lecture.
    expect(def).not.toContain('after:inset-0');
  });

  it('aucun élément interactif imbriqué : les deux liens sont frères', () => {
    const corps = lien.slice(0, lien.indexOf('\n            }'));
    const ouvertures = [...corps.matchAll(/<TrackedAnchor\b|<\/TrackedAnchor>/g)].map((m) => m[0]);
    let profondeur = 0;
    for (const o of ouvertures) {
      profondeur += o.startsWith('</') ? -1 : 1;
      expect(profondeur).toBeLessThanOrEqual(1);
    }
    expect(profondeur).toBe(0);
  });

  it('la section d’inscription garde son ancre', () => {
    expect(page).toMatch(/<section id="subscribe"/);
  });

  it.each(['fr', 'nl', 'en', 'de'])('%s : le libellé du second lien existe', (l) => {
    const m = JSON.parse(readFileSync(resolve(__dirname, `../../messages/${l}.json`), 'utf8'));
    expect(typeof m.home.protoDigestByEmail).toBe('string');
    expect(m.home.protoDigestByEmail.length).toBeGreaterThan(5);
  });
});

describe('formulaire de l’accueil : il reçoit les thèmes des cartes affichées', () => {
  const appel = page.split('<SubscribeForm')[1]?.split('/>')[0] ?? '';

  it('témoin : l’appel du formulaire est bien lu', () => {
    expect(appel).toContain('dossierOptions=');
  });

  it.each([
    ['homeDossiers', 'dossier'],
    ['homeDomains', 'domain'],
    ['homeSectors', 'sector'],
  ])('%s passe par cleDeTheme(\'%s\')', (liste, type) => {
    expect(appel).toContain('sujetsDeLaPage={[');
    expect(appel).toContain(`...${liste}.map((card) => cleDeTheme('${type}', card.slug))`);
  });
});
