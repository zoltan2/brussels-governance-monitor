// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.CRON_SECRET = 'secret-cron';
process.env.RESEND_API_KEY = 'cle-de-test';

const countActiveContacts = vi.fn();
const listActiveContacts = vi.fn();
vi.mock('@/lib/resend', () => ({
  countActiveContacts: () => countActiveContacts(),
  listActiveContacts: () => listActiveContacts(),
  SECTOR_TO_DOMAIN: {},
}));
const collectDigestUpdates = vi.fn();
vi.mock('@/lib/digest-updates', () => ({
  collectDigestUpdates: (...a: unknown[]) => collectDigestUpdates(...a),
  // La règle exacte suffit ici : la vraie est éprouvée dans themes-muets.test.ts.
  filterUpdatesForSubscriber: (f: Array<{ domain: string }>, themes: string[]) =>
    themes.length === 0 ? f : f.filter((x) => themes.includes(x.domain)),
}));
const ecrire = vi.fn();
vi.mock('@/lib/themes-muets-store', () => ({
  ecrireFichierThemesMuets: (...a: unknown[]) => ecrire(...a),
}));

const { GET } = await import('./route');

const requete = (jeton = 'secret-cron') =>
  new Request('https://governance.brussels/api/cron/themes-muets', {
    headers: { authorization: `Bearer ${jeton}` },
  });
const contact = (email: string, topics: string[]) => ({ id: email, email, locale: 'fr', topics, sources: [] });
const aujourdhui = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  countActiveContacts.mockReset().mockResolvedValue(2);
  listActiveContacts.mockReset().mockResolvedValue([
    contact('a@example.org', ['budget']),
    contact('b@example.org', ['education']),
  ]);
  collectDigestUpdates.mockReset().mockReturnValue({
    byLocale: {
      fr: [
        { domain: 'budget', section: 'domains', lastModified: aujourdhui, title: 'Budget', summary: '', url: '' },
        { domain: 'education', section: 'domains', lastModified: '2026-01-05', title: 'Enseignement', summary: '', url: '' },
      ],
    },
  });
  ecrire.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/cron/themes-muets', () => {
  it('sans le secret : 401, aucun abonné lu, rien d’écrit', async () => {
    const res = await GET(requete('faux'));
    expect(res.status).toBe(401);
    expect(listActiveContacts).not.toHaveBeenCalled();
    expect(ecrire).not.toHaveBeenCalled();
  });

  it('calcule, écrit l’instantané et répond par des comptes', async () => {
    const res = await GET(requete());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, abonnes: 2, abonnesEnSilence: 1, themesMuets: 1 });
    expect(ecrire).toHaveBeenCalledTimes(1);
    expect(ecrire.mock.calls[0][0]).toMatchObject({
      abonnes: 2,
      abonnesEnSilence: 1,
      themesMuets: [{ theme: 'education', abonnes: 1, derniereMaj: '2026-01-05' }],
    });
    // Toutes les fiches, pas seulement celles de la semaine.
    expect(collectDigestUpdates.mock.calls[0][0]).toBe('');
  });

  it('ni la réponse ni l’instantané ne portent d’adresse', async () => {
    const res = await GET(requete());
    expect(JSON.stringify(await res.json())).not.toContain('example.org');
    expect(JSON.stringify(ecrire.mock.calls[0][0])).not.toContain('example.org');
  });

  it('liste des abonnés plus courte que le décompte : 500, rien d’écrit', async () => {
    countActiveContacts.mockResolvedValue(5);
    const res = await GET(requete());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false, attendus: 5, lus: 2 });
    expect(ecrire).not.toHaveBeenCalled();
  });

  it('décompte indisponible : 500, rien d’écrit', async () => {
    countActiveContacts.mockResolvedValue(null);
    expect((await GET(requete())).status).toBe(500);
    expect(ecrire).not.toHaveBeenCalled();
  });

  it('aucun abonné lu alors qu’il y en a : 500, pas un instantané à zéro', async () => {
    listActiveContacts.mockResolvedValue([]);
    expect((await GET(requete())).status).toBe(500);
    expect(ecrire).not.toHaveBeenCalled();
  });

  it('aucune fiche lue : 500, rien d’écrit', async () => {
    collectDigestUpdates.mockReturnValue({ byLocale: { fr: [] } });
    expect((await GET(requete())).status).toBe(500);
    expect(ecrire).not.toHaveBeenCalled();
  });

  it('écriture impossible : 500', async () => {
    ecrire.mockRejectedValue(new Error('disque plein'));
    expect((await GET(requete())).status).toBe(500);
  });
});
