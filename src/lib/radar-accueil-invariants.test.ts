// Incident du 28/09/2026 : le bloc « Signaux en cours de vérification » de l'accueil
// ne montre que status === 'active' (src/lib/homepage-signals.ts). Les veilles des
// 23, 27 et 28/09 ont posé « confirmed » (copie de l'entrée voisine) sur des signaux
// dont l'étape suivante était en attente : l'accueil est resté au 24/09 sans
// qu'aucune garde ne rougisse. Ces tests lisent le VRAI data/radar.json (sans
// .velite/) : ils tournent à l'étape « Unit tests » de la CI, avant le build.
// Rejoué sur l'historique, le deuxième test aurait bloqué la veille du 27/09.
// Écrit par l'équipe purple de la revue de l'accueil.
import { describe, expect, it } from 'vitest';
import radarData from '../../data/radar.json';

type Statut = 'active' | 'confirmed' | 'archived';
interface Signal {
  id: string;
  date: string;
  status: Statut;
  confidence: 'official' | 'estimated' | 'unconfirmed';
  nextStep?: Record<string, string>;
}
const radar = radarData as unknown as { lastVeille: string; entries: Signal[] };

// Refonte de l'accueil (#493, 18/09/2026) : depuis, « confirmed » rend un signal
// invisible sur l'accueil. Les entrées plus anciennes n'ont pas été relues sous cet angle.
const REGLE_DEPUIS = '2026-09-18';

const plusRecente = (dates: string[]) => dates.reduce((m, d) => (d > m ? d : m), '');

const aEtapeSuivante = (s: Signal) => Boolean(s.nextStep && Object.values(s.nextStep).some((v) => v.trim()));

/** Un signal reste sous surveillance tant qu'il est actif ou qu'une étape suivante l'attend. */
const sousSurveillance = (s: Signal) => s.status === 'active' || (s.status === 'confirmed' && aEtapeSuivante(s));

describe('radar : ce que l’accueil peut afficher', () => {
  it('témoin : le fichier contient des signaux actifs et une date de veille', () => {
    expect(radar.entries.length).toBeGreaterThan(0);
    expect(radar.entries.some((s) => s.status === 'active')).toBe(true);
    expect(radar.lastVeille).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('le signal surveillé le plus récent est visible sur l’accueil (statut active)', () => {
    const actif = plusRecente(radar.entries.filter((s) => s.status === 'active').map((s) => s.date));
    const surveille = plusRecente(radar.entries.filter(sousSurveillance).map((s) => s.date));
    const caches = radar.entries
      .filter((s) => s.status === 'confirmed' && aEtapeSuivante(s) && s.date > actif)
      .map((s) => `${s.id} (confirmed, étape suivante en attente)`);
    expect(
      actif,
      `L’accueil s’arrêterait au ${actif} alors que le radar suit des signaux du ${surveille}.\n` +
        `Invisibles sur l’accueil :\n  ${caches.join('\n  ')}\n` +
        `Un signal dont l’étape suivante est en attente est « active ».`,
    ).toBe(surveille);
  });

  it(`aucun signal entré depuis le ${REGLE_DEPUIS} n’est « confirmed » avec une étape suivante en attente`, () => {
    const fautifs = radar.entries
      .filter((s) => s.date >= REGLE_DEPUIS && s.status === 'confirmed' && aEtapeSuivante(s))
      .map((s) => s.id);
    expect(fautifs, '« confirmed » = plus rien à surveiller ; ces signaux ont une étape suivante').toEqual([]);
  });

  it('un signal « confirmed » ne peut pas avoir une confiance « unconfirmed »', () => {
    const contradictoires = radar.entries
      .filter((s) => s.status === 'confirmed' && s.confidence === 'unconfirmed')
      .map((s) => s.id);
    expect(contradictoires).toEqual([]);
  });

  it('lastVeille n’est pas antérieure au signal le plus récent', () => {
    const recent = plusRecente(radar.entries.map((s) => s.date));
    expect(radar.lastVeille >= recent, `lastVeille ${radar.lastVeille} < signal du ${recent}`).toBe(true);
  });
});
