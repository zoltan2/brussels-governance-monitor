import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cardFileForPath, checkSourcesAgainstCards } from '../sources-check';
import type { Magazine, MagazineItem } from '../types';

// Décision du 27/09/2026 : les sources du magazine sont reprises des fiches, pas
// recopiées à la main. Le build vérifie que chaque URL citée figure dans la
// liste `sources` de la fiche que le sujet désigne par son `path`.

describe('cardFileForPath', () => {
  it('traduit un chemin du site en fichier de fiche française', () => {
    expect(cardFileForPath('/fr/domaines/budget')).toBe('content/domain-cards/budget.fr.mdx');
    expect(cardFileForPath('/fr/dossiers/zone-revitalisation-urbaine')).toBe('content/dossiers/zone-revitalisation-urbaine.fr.mdx');
    expect(cardFileForPath('/fr/communes/bruxelles-ville')).toBe('content/commune-cards/bruxelles-ville.fr.mdx');
    expect(cardFileForPath('/fr/secteurs/culture')).toBe('content/sector-cards/culture.fr.mdx');
    expect(cardFileForPath('/fr/solutions/x')).toBe('content/solution-cards/x.fr.mdx');
  });

  it('rend null pour un chemin inconnu ou absent', () => {
    expect(cardFileForPath('/fr/chronologie')).toBeNull();
    expect(cardFileForPath(undefined)).toBeNull();
    expect(cardFileForPath('https://governance.brussels/fr/domaines/budget')).toBe('content/domain-cards/budget.fr.mdx');
  });
});

function item(over: Partial<MagazineItem>): MagazineItem {
  return {
    headline: 'x', stat: '1', stat_label: 'l', description: 'd', howto: 'h',
    path: '/fr/domaines/budget',
    sources: [{ label: 'A', url: 'https://a.example/1', kind: 'primaire' }],
    ...over,
  };
}

describe('checkSourcesAgainstCards', () => {
  const root = mkdtempSync(join(tmpdir(), 'mag-'));
  mkdirSync(join(root, 'content/domain-cards'), { recursive: true });
  writeFileSync(
    join(root, 'content/domain-cards/budget.fr.mdx'),
    `---\ntitle: "Budget"\nsources:\n  - label: "A"\n    url: "https://a.example/1"\n    accessedAt: "2026-09-27"\n---\n# Budget\n`,
  );
  const mag = (items: MagazineItem[]): Magazine => ({ version: 2, tagline: 't', closing_line: 'c', items });

  it('ne signale rien quand chaque URL citée est dans la fiche', () => {
    expect(checkSourcesAgainstCards(mag([item({})]), root)).toEqual([]);
  });

  it('signale une URL absente de la fiche, en nommant le sujet, l’URL et la fiche', () => {
    const errors = checkSourcesAgainstCards(mag([item({ sources: [{ label: 'B', url: 'https://b.example/2', kind: 'secondaire' }] })]), root);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.itemIndex).toBe(0);
    expect(errors[0]!.field).toBe('sources');
    expect(errors[0]!.reason).toContain('https://b.example/2');
    expect(errors[0]!.reason).toContain('content/domain-cards/budget.fr.mdx');
  });

  it('signale une fiche introuvable, et ignore un sujet sans chemin de fiche', () => {
    expect(checkSourcesAgainstCards(mag([item({ path: '/fr/domaines/inconnue' })]), root)[0]!.reason).toContain('introuvable');
    expect(checkSourcesAgainstCards(mag([item({ path: undefined })]), root)).toEqual([]);
    expect(checkSourcesAgainstCards(mag([item({ path: '/fr/chronologie' })]), root)).toEqual([]);
  });

  it('ne vérifie rien pour un magazine v1', () => {
    expect(checkSourcesAgainstCards({ tagline: 't', closing_line: 'c', items: [item({ sources: [{ label: 'B', url: 'https://b.example/2', kind: 'secondaire' }] })] }, root)).toEqual([]);
  });
});
