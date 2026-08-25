import { describe, it, expect } from 'vitest';
import { clientIp } from './client-ip';

const h = (o: Record<string, string>) => new Headers(o);

describe('clientIp', () => {
  /* LE CŒUR DU TEST. Caddy réécrit x-forwarded-for avec {client_ip} et l'ajoute
     EN DERNIER. La première valeur est envoyée par le client : toute limitation
     de débit fondée dessus se contourne en faisant tourner l'en-tête. */
  it('prend la DERNIÈRE valeur de x-forwarded-for, pas la première', () => {
    expect(clientIp(h({ 'x-forwarded-for': '9.9.9.9, 203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('ignore les valeurs vides et les espaces', () => {
    expect(clientIp(h({ 'x-forwarded-for': ' 1.1.1.1 ,  , 203.0.113.7 ' }))).toBe('203.0.113.7');
  });

  it('retombe sur x-real-ip', () => {
    expect(clientIp(h({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
  });

  it('rend "unknown" plutôt que de deviner', () => {
    expect(clientIp(h({}))).toBe('unknown');
  });

  /* CF-Connecting-IP est volontairement ignoré : le pare-feu du VPS ouvre 443
     à tous et l'origine répond en direct, donc cet en-tête est choisi par
     l'attaquant dès qu'il court-circuite Cloudflare. */
  it('ignore CF-Connecting-IP', () => {
    expect(clientIp(h({ 'cf-connecting-ip': '6.6.6.6' }))).toBe('unknown');
  });
});
