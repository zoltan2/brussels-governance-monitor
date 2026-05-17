import { describe, it, expect } from 'vitest';
import { renderMagazine } from '../render';
import type { MagazineDraft } from '../types';

function draft(): MagazineDraft {
  return {
    week: '2026-w15',
    weekShort: 's15',
    lang: 'fr',
    title: 'Digest BGM — Semaine 15',
    generated_at: '2026-04-12',
    magazine: {
      tagline: 'Sept signaux.',
      closing_line: 'Retour lundi.',
      items: [
        {
          category: 'Cat 1',
          headline: 'Un.',
          path: '/fr/1',
          stat: '100',
          stat_label: 'Label 1',
          pill: 'Pill 1',
          description: 'Description one, long enough to satisfy the real render path. '.repeat(3),
          howto: 'How-to one, long enough. '.repeat(4),
        },
        {
          category: 'Cat 2',
          headline: 'Deux.',
          path: '/fr/2',
          stat: '200',
          stat_label: 'Label 2',
          pill: 'Pill 2',
          description: 'Description two, long enough to satisfy the real render path. '.repeat(3),
          howto: 'How-to two, long enough. '.repeat(4),
        },
        {
          category: 'Cat 3',
          headline: 'Trois.',
          path: '/fr/3',
          stat: '300',
          stat_label: 'Label 3',
          pill: 'Pill 3',
          description: 'Description three, long enough to satisfy the real render path. '.repeat(3),
          howto: 'How-to three, long enough. '.repeat(4),
        },
      ],
    },
  };
}

describe('renderMagazine', () => {
  it('produces a complete HTML document', () => {
    const html = renderMagazine(draft());
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<title>BGM — Digest S15');
    expect(html).toContain('Sept signaux.');
    expect(html).toContain('Un.');
    expect(html).toContain('Deux.');
    expect(html).toContain('Trois.');
    expect(html).toContain('Retour lundi.');
  });

  it('includes @media print CSS rules', () => {
    const html = renderMagazine(draft());
    expect(html).toContain('@media print');
    expect(html).toContain('@page');
    expect(html).toContain('size: A4 landscape');
  });

  it('renders N+3 pages (cover + items + closing + business card)', () => {
    const html = renderMagazine(draft());
    const pageMatches = html.match(/<section class="page/g) ?? [];
    expect(pageMatches.length).toBe(6);
  });

  it('escapes HTML in user-provided fields', () => {
    const d = draft();
    d.magazine!.items[0].headline = 'Evil <script>x</script>';
    const html = renderMagazine(d);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('Evil &lt;script&gt;');
  });

  it('throws when magazine is undefined', () => {
    const d = draft();
    d.magazine = undefined;
    expect(() => renderMagazine(d)).toThrow(/magazine.*undefined/i);
  });

  it('makes item path clickable with absolute governance.brussels URL (new tab)', () => {
    const html = renderMagazine(draft());
    expect(html).toContain(
      'href="https://governance.brussels/fr/1"',
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('class="path path--link"');
  });

  it('makes item pill clickable when a path is provided', () => {
    const html = renderMagazine(draft());
    expect(html).toContain('class="pill pill--link"');
    const pillLinkMatches = html.match(/class="pill pill--link"/g) ?? [];
    expect(pillLinkMatches.length).toBe(3);
  });

  it('renders non-clickable plain pill when item has no path', () => {
    const d = draft();
    d.magazine!.items[2].path = undefined;
    const html = renderMagazine(d);
    expect(html).toContain('<div class="pill">Pill 3</div>');
  });

  it('renders a business card page with manifesto, signature, offer, and contacts', () => {
    const html = renderMagazine(draft());
    expect(html).toContain('class="page dark card-page"');
    expect(html).toContain('Zoltán Jánosi');
    expect(html).toContain('Brussels Governance Monitor');
    expect(html).toContain('Advice That SRL');
    expect(html).toContain('Conseil en stratégie');
    expect(html).toContain('mailto:contact@brusselsgovernance.be');
    expect(html).toContain('href="https://linkedin.com/in/zoltan"');
  });

  it('places business card page before the closing "À lundi" page', () => {
    const html = renderMagazine(draft());
    const cardIdx = html.indexOf('class="page dark card-page"');
    const backIdx = html.indexOf('class="back-line"');
    expect(cardIdx).toBeGreaterThan(0);
    expect(backIdx).toBeGreaterThan(0);
    expect(cardIdx).toBeLessThan(backIdx);
  });

  it('renders a week-number badge inside each odd item page', () => {
    const html = renderMagazine(draft());
    // Fixture week is "2026-w15" / weekShort "s15" → label expected: "S15 · 2026-W15"
    const badgeMatches = html.match(/class="page-week"[^>]*>S15 · 2026-W15</g) ?? [];
    expect(badgeMatches.length).toBe(2); // 2 odd pages out of 3
  });

  it('marks odd item pages with .page-odd class (cover excluded)', () => {
    const html = renderMagazine(draft());
    // 3 items in fixture → items at rank 1, 2, 3 → odd ranks are 1 and 3
    const oddMatches = html.match(/class="page [^"]*page-odd/g) ?? [];
    expect(oddMatches.length).toBe(2);
    // The cover (first <section class="page dark">) must NOT have .page-odd
    const coverSection = html.match(/<section class="page dark"[^>]*>\s*<div class="cover"/);
    expect(coverSection).not.toBeNull();
    expect(coverSection![0]).not.toContain('page-odd');
  });

  it('introduces clamp() tokens for body text', () => {
    const html = renderMagazine(draft());
    expect(html).toContain('clamp(13px, 1.15vw, 17px)');   // .desc
    expect(html).toContain('clamp(12px, 1.0vw, 15px)');    // .callout-text
    expect(html).toContain('clamp(10px, 0.75vw, 12px)');   // .callout-label / .page-meta
    expect(html).toContain('clamp(11px, 0.85vw, 14px)');   // .stat-label
    expect(html).toContain('clamp(11px, 0.85vw, 13px)');   // .path / .pill
  });

  it('declares the three-zone responsive backbone', () => {
    const html = renderMagazine(draft());
    // Zone 1 — base padding for .page (preserved as the "généreux" landscape default)
    expect(html).toContain('padding: 8vh 7vw 10vh 7vw');
    // Zone 2 — small landscape (square-ish) media query, exact form
    expect(html).toContain('@media (min-aspect-ratio: 4/5) and (max-aspect-ratio: 4/3) and (min-width: 900px)');
    // Zone 3 — fallback vertical media query, exact form
    expect(html).toContain('@media (max-width: 900px), (max-height: 700px), (orientation: portrait)');
  });

  it('inlines a matchMedia listener that resets transform on vertical/horizontal crossing', () => {
    const html = renderMagazine(draft());
    expect(html).toContain("matchMedia('(max-width: 900px), (max-height: 700px), (orientation: portrait)')");
    expect(html).toMatch(/track\.style\.transform\s*=\s*['"]['"]/)
  });

  it('rewrites layout to vertical under zone 3 (token presence)', () => {
    const html = renderMagazine(draft());
    expect(html).toContain('@media (max-width: 900px), (max-height: 700px), (orientation: portrait)');
    // Distinctive declarations that only appear under zone 3:
    expect(html).toContain('flex-direction: column');
    expect(html).toContain('min-height: 100vh');
    expect(html).toContain('grid-template-columns: 1fr');
    // The "transform: none" + "transition: none" combo on .track is unique to zone 3:
    expect(html).toContain('transform: none');
    expect(html).toContain('transition: none');
  });

  it('bounds vw-based headlines and stats with explicit clamp() tokens', () => {
    const html = renderMagazine(draft());
    expect(html).toContain('clamp(36px, 5.2vw, 96px)');     // .headline
    expect(html).toContain('clamp(56px, 6.8vw, 160px)');    // .stat-num
    expect(html).toContain('clamp(48px, 5.4vw, 130px)');    // .stat-num.small
    expect(html).toContain('clamp(80px, 16vw, 280px)');     // .cover-title
    expect(html).toContain('clamp(18px, 2vw, 36px)');       // .cover-tagline
    expect(html).toContain('clamp(48px, 8vw, 160px)');      // .back-line
    expect(html).toContain('clamp(120px, 28vw, 480px)');    // .cover-count
    expect(html).toContain('clamp(160px, 34vw, 600px)');    // .ghost-rank
  });

  it('styles dots as discreet always-visible progress indicators (token presence)', () => {
    const html = renderMagazine(draft());
    // The .dot.active rule's opacity:1 is the unique signal "active = full bright".
    expect(html).toContain('.dot.active { opacity: 1 }');
    // The default 6px circle dot is a distinctive shape token.
    expect(html).toContain('width: 6px;');
    expect(html).toContain('height: 6px;');
    expect(html).toContain('border-radius: 50%;');
  });
});
