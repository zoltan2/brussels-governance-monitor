import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateDigestPlainText } from '@/emails/digest';
import { magazineUrlForSubscriber } from '../email-link';

// Décision de Zoltán du 15/11/2026 : l'email du digest renvoie vers le
// magazine, dans la langue de l'abonné.

const avec = (...langs: string[]) => (l: string) => langs.includes(l);

describe('magazineUrlForSubscriber', () => {
  it('édition de la langue de l’abonné quand elle existe', () => {
    expect(magazineUrlForSubscriber('2026-w47', 'fr', avec('fr', 'nl', 'en'))).toBe('https://magazine.governance.brussels/s47/');
    expect(magazineUrlForSubscriber('2026-w47', 'nl', avec('fr', 'nl', 'en'))).toBe('https://magazine.governance.brussels/nl/s47/');
    expect(magazineUrlForSubscriber('2026-w47', 'en', avec('fr', 'nl', 'en'))).toBe('https://magazine.governance.brussels/en/s47/');
  });

  it('édition française pour une langue sans édition cette semaine', () => {
    expect(magazineUrlForSubscriber('2026-w47', 'nl', avec('fr'))).toBe('https://magazine.governance.brussels/s47/');
    expect(magazineUrlForSubscriber('2026-w47', 'de', avec('fr', 'nl', 'en'))).toBe('https://magazine.governance.brussels/s47/');
  });

  it('aucun lien sans bloc français, même si une traduction en porte un', () => {
    expect(magazineUrlForSubscriber('2026-w47', 'fr', avec())).toBeUndefined();
    expect(magazineUrlForSubscriber('2026-w47', 'nl', avec('nl'))).toBeUndefined();
  });

  it('garde le zéro du numéro de semaine, et refuse une semaine illisible', () => {
    expect(magazineUrlForSubscriber('2027-w05', 'fr', avec('fr'))).toBe('https://magazine.governance.brussels/s05/');
    expect(magazineUrlForSubscriber('2027', 'fr', avec('fr'))).toBeUndefined();
    expect(magazineUrlForSubscriber('2027-w5x', 'fr', avec('fr'))).toBeUndefined();
  });
});

// Jusqu'au 15/11/2026, les trois routes lisaient `digest.magazine` dans
// pending-digest.json, qui n'a jamais eu ce champ : le lien n'est jamais parti.
describe('routes d’envoi du digest', () => {
  const routes = ['src/app/api/cron/digest/route.ts', 'src/app/api/digest/approve-from-review/route.ts', 'src/app/api/digest/test-send/route.ts'];
  it.each(routes)('%s calcule le lien par langue, plus jamais depuis pending-digest', (file) => {
    const src = readFileSync(join(process.cwd(), file), 'utf-8');
    expect(src).toContain('magazineUrlForSubscriber(digest.week, locale,');
    expect(src).not.toMatch(/digest\.magazine\b/);
    expect(src).not.toContain('magazine.governance.brussels/s$');
  });

  it('le texte de l’email porte le lien, avec le libellé de la langue', () => {
    const props = {
      updates: [],
      weekOf: '16 november 2026',
      unsubscribeUrl: 'https://governance.brussels/nl/subscribe/preferences?token=x',
      summaryLine: 'Samenvatting.',
      weeklyNumber: { value: '1', label: 'label', source: 'bron' },
      closingNote: 'Tot maandag.',
      commitmentCount: 16,
      siteUrl: 'https://governance.brussels',
    };
    const url = magazineUrlForSubscriber('2026-w47', 'nl', avec('fr', 'nl'))!;
    expect(generateDigestPlainText({ ...props, locale: 'nl', magazineUrl: url })).toContain('Lees de magazine-versie → https://magazine.governance.brussels/nl/s47/');
    expect(generateDigestPlainText({ ...props, locale: 'nl' })).not.toContain('magazine.governance.brussels');
  });
});

