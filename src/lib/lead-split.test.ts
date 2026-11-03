import { describe, expect, it } from 'vitest';
import { leadSplit } from './lead-split';

describe('leadSplit', () => {
  it('garde entière une phrase unique qui se termine par un point', () => {
    // Le 26/10/2026, onze fiches commune avaient un changeSummary d'une phrase :
    // le titre d'email devenait « …le projet Key West, rebaptisé… ».
    const t = "Bassin de Biestebroeck : le Conseil d'État annule le permis du projet Key West, rebaptisé A'Rive.";
    expect(leadSplit(t)).toEqual({ headline: t, body: '' });
  });

  it('garde entière une phrase unique finissant par ! ou ?', () => {
    expect(leadSplit('Une phrase assez longue pour dépasser quarante caractères, posée en question ?').headline)
      .toBe('Une phrase assez longue pour dépasser quarante caractères, posée en question ?');
  });

  it('prend la première phrase quand il y en a deux', () => {
    expect(leadSplit('Première phrase du résumé. Seconde phrase.')).toEqual({
      headline: 'Première phrase du résumé.',
      body: 'Seconde phrase.',
    });
  });

  it('coupe au mot avec « … » une phrase unique trop longue', () => {
    const t = `${'mot '.repeat(40).trim()}.`;
    const { headline } = leadSplit(t);
    expect(headline.endsWith('…')).toBe(true);
    expect(headline.length).toBeLessThanOrEqual(111);
  });

  it('coupe encore au mot un texte sans ponctuation finale', () => {
    const t = 'Un texte sans point final qui dépasse largement les cent dix caractères pour forcer une coupure au mot près';
    expect(leadSplit(t).headline.endsWith('…')).toBe(true);
  });

  it('coupe toujours une date allemande « 06.11. » suivie d’une espace (piège connu, inchangé)', () => {
    expect(leadSplit('Untersuchung vom 06.11. bis 05.12.2026, Infoabend am 09.11.2026.').headline)
      .toBe('Untersuchung vom 06.11.');
  });

  it('laisse gagner le digestHeadline manuel', () => {
    expect(leadSplit('Texte. Suite.', 'Manuel')).toEqual({ headline: 'Manuel', body: 'Texte. Suite.' });
  });
});
