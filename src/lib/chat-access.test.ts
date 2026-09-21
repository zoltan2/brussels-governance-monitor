// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  CHAT_ACCESS_COOKIE,
  mintChatAccess,
  readChatTier,
  verifyChatAccess,
} from './chat-access';

const SECRET_ORIGINE = process.env.AUTH_SECRET;

beforeEach(() => {
  process.env.AUTH_SECRET = 'secret-de-test-suffisamment-long-pour-hmac';
});

afterEach(() => {
  if (SECRET_ORIGINE === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = SECRET_ORIGINE;
});

function entete(cookie: string): Headers {
  return new Headers({ cookie });
}

describe('acces au chatbot', () => {
  it('accepte un cookie qu il vient de signer', () => {
    const { value } = mintChatAccess('cs_test_123');
    expect(verifyChatAccess(value)).toBe(true);
    expect(readChatTier(entete(`${CHAT_ACCESS_COOKIE}=${value}`))).toBe('paid');
  });

  it('refuse en l absence de cookie', () => {
    expect(readChatTier(new Headers())).toBe('free');
    expect(readChatTier(entete('autre=1'))).toBe('free');
  });

  /**
   * Le coeur du correctif du 21/09 : avant, le niveau d'acces etait un champ du
   * corps de la requete. Ecrire « payant » suffisait. Ici, une valeur fabriquee
   * a la main ne passe pas la signature.
   */
  it('refuse une valeur fabriquee sans la cle', () => {
    const charge = Buffer.from(
      JSON.stringify({ type: 'chat-access', ref: 'x', exp: Date.now() + 100_000 }),
    ).toString('base64url');
    expect(verifyChatAccess(`${charge}.signature-inventee`)).toBe(false);
    expect(readChatTier(entete(`${CHAT_ACCESS_COOKIE}=${charge}.signature-inventee`))).toBe('free');
  });

  it('refuse un cookie signe avec une autre cle', () => {
    const { value } = mintChatAccess('cs_test_123');
    process.env.AUTH_SECRET = 'une-tout-autre-cle-de-signature-ici';
    expect(verifyChatAccess(value)).toBe(false);
  });

  it('refuse un cookie perime', () => {
    const charge = Buffer.from(
      JSON.stringify({ type: 'chat-access', ref: 'x', exp: Date.now() - 1 }),
    ).toString('base64url');
    // Signe correctement, mais date depassee : la peremption est verifiee apres
    // la signature, pas a sa place.
    const { value } = mintChatAccess('cs_test_123');
    const signature = value.split('.')[1];
    expect(verifyChatAccess(`${charge}.${signature}`)).toBe(false);
  });

  it('refuse un jeton d un autre usage signe avec la meme cle', () => {
    // AUTH_SECRET signe aussi les jetons de desabonnement et de confirmation.
    // Sans controle du champ `type`, un jeton d une autre famille passerait.
    const charge = Buffer.from(
      JSON.stringify({ type: 'unsub', email: 'a@b.co', exp: Date.now() + 100_000 }),
    ).toString('base64url');
    const { value } = mintChatAccess('cs_test_123');
    expect(verifyChatAccess(`${charge}.${value.split('.')[1]}`)).toBe(false);
  });

  it('echoue ferme sur une valeur malformee', () => {
    for (const mauvais of ['', 'sans-point', 'a.b.c', '.', '..', 'zzz.zzz']) {
      expect(verifyChatAccess(mauvais)).toBe(false);
    }
  });

  it('lit le bon cookie parmi plusieurs', () => {
    const { value } = mintChatAccess('cs_test_123');
    const entetes = entete(`NEXT_LOCALE=fr; ${CHAT_ACCESS_COOKIE}=${value}; autre=2`);
    expect(readChatTier(entetes)).toBe('paid');
  });
});
