/**
 * Exécute le script en ligne réel dans un faux `window`, pour vérifier ce qui
 * partirait vers Umami. Voir `umami-before-send.ts` pour le pourquoi.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { UMAMI_BEFORE_SEND, UMAMI_BEFORE_SEND_SCRIPT } from './umami-before-send';

type Payload = { url?: string; referrer?: string; [k: string]: unknown } | null;
type BeforeSend = (type: string, p: Payload) => Payload;

function charger(href = 'https://governance.brussels/fr/dossiers/lez'): BeforeSend {
  const fenetre: Record<string, unknown> = {};
  const contexte = vm.createContext({
    window: fenetre,
    location: new URL(href),
    URL,
    URLSearchParams,
  });
  vm.runInContext(UMAMI_BEFORE_SEND_SCRIPT, contexte);
  const fn = fenetre[UMAMI_BEFORE_SEND];
  expect(typeof fn).toBe('function');
  return fn as BeforeSend;
}

const ORIGINE = 'https://governance.brussels';

describe('filtre des URL envoyées à Umami', () => {
  it("retire le jeton d'abonné de l'URL", () => {
    const f = charger();
    const p = f('pageview', { url: `${ORIGINE}/fr/subscribe/preferences?token=secret123` });
    expect(p?.url).toBe(`${ORIGINE}/fr/subscribe/preferences`);
  });

  it('garde les UTM et elles seules', () => {
    const f = charger();
    const p = f('pageview', {
      url: `${ORIGINE}/fr/dossiers/lez?utm_source=bgm-digest&token=secret&utm_medium=email&q=lez&utm_campaign=2026-w38`,
    });
    expect(p?.url).toBe(
      `${ORIGINE}/fr/dossiers/lez?utm_source=bgm-digest&utm_medium=email&utm_campaign=2026-w38`,
    );
  });

  it("ne laisse pas passer un paramètre qui ressemble à une UTM sans en être une", () => {
    const f = charger();
    const p = f('pageview', { url: `${ORIGINE}/fr?utm_source_token=secret&xutm_source=a&UTM_SOURCE=b` });
    expect(p?.url).toBe(`${ORIGINE}/fr`);
  });

  it('supprime le fragment', () => {
    const f = charger();
    const p = f('pageview', { url: `${ORIGINE}/fr/dossiers/lez?utm_source=x#token=secret` });
    expect(p?.url).toBe(`${ORIGINE}/fr/dossiers/lez?utm_source=x`);
  });

  it("filtre aussi le référent interne, qui porte l'URL précédente", () => {
    const f = charger();
    const p = f('pageview', {
      url: `${ORIGINE}/fr`,
      referrer: `${ORIGINE}/fr/subscribe/preferences?token=secret123`,
    });
    expect(p?.referrer).toBe(`${ORIGINE}/fr/subscribe/preferences`);
  });

  it("réduit un référent externe à son origine et son chemin", () => {
    const f = charger();
    const p = f('pageview', {
      url: `${ORIGINE}/fr`,
      referrer: 'https://www.google.com/search?q=bruxelles+taxis&token=x#frag',
    });
    expect(p?.referrer).toBe('https://www.google.com/search');
  });

  it("filtre les événements personnalisés comme les pages vues", () => {
    const f = charger();
    const p = f('event', { name: 'accueil-fiche', url: `${ORIGINE}/fr?token=secret`, data: { slug: 'lez' } });
    expect(p?.url).toBe(`${ORIGINE}/fr`);
    expect(p?.name).toBe('accueil-fiche');
    expect(p?.data).toEqual({ slug: 'lez' });
  });

  it("annule l'envoi si l'URL est illisible plutôt que de l'envoyer brute", () => {
    const f = charger();
    expect(f('pageview', { url: 'http://[::1' })).toBeNull();
  });

  it('laisse passer une charge sans URL ni référent', () => {
    const f = charger();
    expect(f('pageview', { title: 'BGM' })).toEqual({ title: 'BGM' });
  });

  it("n'envoie rien pour les pages internes admin, review et login", () => {
    const f = charger();
    for (const chemin of ['/fr/admin', '/fr/admin/rapport', '/nl/review', '/en/login', '/de/admin/quiz?x=1']) {
      expect(f('pageview', { url: `${ORIGINE}${chemin}` })).toBeNull();
      expect(f('event', { name: 'x', url: `${ORIGINE}${chemin}` })).toBeNull();
    }
  });

  it('continue de compter les pages publiques proches de ces noms', () => {
    const f = charger();
    for (const chemin of ['/fr/refonte', '/fr/dossiers/administration', '/fr/adminx', '/fr/reviews-du-mois']) {
      expect(f('pageview', { url: `${ORIGINE}${chemin}` })?.url).toBe(`${ORIGINE}${chemin}`);
    }
  });
});
