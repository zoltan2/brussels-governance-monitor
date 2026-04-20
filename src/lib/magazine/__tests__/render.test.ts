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
});
