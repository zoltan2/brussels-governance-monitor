// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Appels Resend de la purge RGPD : liste complète des désinscrits (toutes les
 * pages) et suppression dont l'erreur est lue (tech_resend_silent_fail).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const list = vi.fn();
const remove = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    contacts = { list, remove };
  },
}));

process.env.RESEND_API_KEY = 'test-key';

const { listUnsubscribedContacts, deleteContactById } = await import('./resend');

function page(rows: { id: string; email: string; unsubscribed: boolean }[], hasMore = false) {
  return { data: { data: rows, has_more: hasMore }, error: null };
}

beforeEach(() => {
  list.mockReset();
  remove.mockReset();
});

describe('listUnsubscribedContacts', () => {
  it('parcourt toutes les pages et ne garde que les désinscrits', async () => {
    list
      .mockResolvedValueOnce(
        page(
          [
            { id: 'a', email: 'a@example.org', unsubscribed: true },
            { id: 'b', email: 'b@example.org', unsubscribed: false },
          ],
          true,
        ),
      )
      .mockResolvedValueOnce(page([{ id: 'c', email: 'c@example.org', unsubscribed: true }]));

    const r = await listUnsubscribedContacts();
    expect(r.complete).toBe(true);
    expect(r.contacts.map((c) => c.id)).toEqual(['a', 'c']);
    expect(list).toHaveBeenLastCalledWith({ limit: 100, after: 'b' });
  });

  it('signale une liste incomplète, sans recopier le message d’erreur', async () => {
    list.mockResolvedValue({
      data: null,
      error: { name: 'application_error', statusCode: 500, message: 'x@example.org' },
    });
    const r = await listUnsubscribedContacts();
    expect(r.complete).toBe(false);
    expect(r.error).toBe('application_error 500');
  });
});

describe('deleteContactById', () => {
  it('supprime par id et rend null quand Resend accepte', async () => {
    remove.mockResolvedValue({ data: { deleted: true }, error: null });
    expect(await deleteContactById('c1')).toBeNull();
    expect(remove).toHaveBeenCalledWith({ id: 'c1' });
  });

  it('rend l’erreur quand Resend refuse : un refus ne passe pas pour un succès', async () => {
    remove.mockResolvedValue({ data: null, error: { name: 'not_found', statusCode: 404 } });
    expect(await deleteContactById('c1')).toBe('not_found 404');
  });
});
