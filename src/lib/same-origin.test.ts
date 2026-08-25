import { describe, it, expect } from 'vitest';
import { sameOriginRefusal } from './same-origin';

function headers(h: Record<string, string>): Headers {
  return new Headers(h);
}

describe('sameOriginRefusal', () => {
  it('laisse passer une requête de la page elle-même', () => {
    expect(
      sameOriginRefusal(
        headers({
          host: 'governance.brussels',
          origin: 'https://governance.brussels',
          'sec-fetch-site': 'same-origin',
        }),
      ),
    ).toBeNull();
  });

  /** Le vecteur réel : un sous-domaine servant du logiciel tiers, que le
   *  cookie SameSite=Lax n'écarte pas. */
  it('refuse un sous-domaine du même site', () => {
    expect(
      sameOriginRefusal(
        headers({
          host: 'governance.brussels',
          origin: 'https://analytics.governance.brussels',
          'sec-fetch-site': 'same-site',
        }),
      ),
    ).not.toBeNull();
  });

  it('refuse une requête sans en-tête Origin', () => {
    expect(
      sameOriginRefusal(headers({ host: 'governance.brussels', 'sec-fetch-site': 'same-origin' })),
    ).not.toBeNull();
  });

  it('refuse un site tiers', () => {
    expect(
      sameOriginRefusal(
        headers({
          host: 'governance.brussels',
          origin: 'https://exemple.test',
          'sec-fetch-site': 'cross-site',
        }),
      ),
    ).not.toBeNull();
  });

  it('refuse une origine qui imite l’hôte par un suffixe', () => {
    expect(
      sameOriginRefusal(
        headers({
          host: 'governance.brussels',
          origin: 'https://governance.brussels.exemple.test',
          'sec-fetch-site': 'same-origin',
        }),
      ),
    ).not.toBeNull();
  });
});
