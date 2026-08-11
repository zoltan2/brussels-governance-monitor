// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Régression du 2026-08-11 : la tuile Abonnés de /admin restait bloquée sur
 * son fallback Suspense. Cause racine : elle appelait listActiveContacts(),
 * qui fait un appel API par contact pour récupérer ses propriétés, alors
 * que chaque appel Resend est espacé de 600 ms par throttle(). Avec 91
 * abonnés actifs, cela fait 92 appels, soit 55 secondes au minimum.
 *
 * Ces tests garantissent que le comptage ne redevient jamais linéaire.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const list = vi.fn();
const get = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    contacts = { list, get };
  },
}));

process.env.RESEND_API_KEY = 'test-key';

const { countActiveContacts } = await import('./resend');

function page(rows: { id: string; unsubscribed: boolean }[], hasMore = false) {
  return { data: { data: rows, has_more: hasMore }, error: null };
}

beforeEach(() => {
  list.mockReset();
  get.mockReset();
});

describe('countActiveContacts', () => {
  it('compte les contacts non désabonnés', async () => {
    list.mockResolvedValueOnce(
      page([
        { id: '1', unsubscribed: false },
        { id: '2', unsubscribed: true },
        { id: '3', unsubscribed: false },
      ]),
    );
    expect(await countActiveContacts()).toBe(2);
  });

  it("ne fait aucun appel par contact, c'est tout l'objet du correctif", async () => {
    list.mockResolvedValueOnce(
      page(
        Array.from({ length: 50 }, (_, i) => ({
          id: String(i),
          unsubscribed: false,
        })),
      ),
    );
    await countActiveContacts();
    expect(get).not.toHaveBeenCalled();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('parcourt les pages suivantes tant que has_more est vrai', async () => {
    list
      .mockResolvedValueOnce(
        page([{ id: 'a', unsubscribed: false }], true),
      )
      .mockResolvedValueOnce(page([{ id: 'b', unsubscribed: false }]));
    expect(await countActiveContacts()).toBe(2);
    expect(list).toHaveBeenCalledTimes(2);
    expect(get).not.toHaveBeenCalled();
  });

  it('rend null en cas d\'erreur, pour distinguer la panne du zéro', async () => {
    list.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await countActiveContacts()).toBeNull();
  });
});
