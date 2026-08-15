// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { clientIp } from './client-ip';

describe('clientIp', () => {
  it('retient la dernière valeur, celle que pose le proxy', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9' });
    expect(clientIp(h)).toBe('9.9.9.9');
  });

  it('ignore un x-forwarded-for forgé par le client', () => {
    const h = new Headers({ 'x-forwarded-for': 'usurpe, 9.9.9.9' });
    expect(clientIp(h)).toBe('9.9.9.9');
  });

  it("n'utilise jamais CF-Connecting-IP", () => {
    const h = new Headers({
      'cf-connecting-ip': '6.6.6.6',
      'x-forwarded-for': '9.9.9.9',
    });
    expect(clientIp(h)).toBe('9.9.9.9');
  });

  it('se rabat sur x-real-ip puis sur unknown', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
    expect(clientIp(new Headers())).toBe('unknown');
  });

  it('ne renvoie jamais de chaîne vide', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4,  ' }))).toBe('1.2.3.4');
  });
});
