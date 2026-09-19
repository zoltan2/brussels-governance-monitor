// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Récap hebdomadaire des précommandes du livre, envoyé le mardi à 09:00.
 *
 * Le test le plus important de ce fichier est celui de la semaine vide : le
 * mail part même à zéro précommande, pour qu'une boîte silencieuse signifie
 * « le cron est cassé » et non « semaine calme ». C'est précisément cette
 * ambiguïté qui a laissé passer quatre mois de pertes en 2026.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

// Le journal est simulé, mais recapWindow reste la vraie : c'est elle qui
// décide de la période couverte.
const listPreordersBetween = vi.fn();
const readRecapCursor = vi.fn();
const saveRecapCursor = vi.fn();
vi.mock('@/lib/preorder-log', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/preorder-log')>()),
  listPreordersBetween: (...args: unknown[]) => listPreordersBetween(...args),
  readRecapCursor: () => readRecapCursor(),
  saveRecapCursor: (...args: unknown[]) => saveRecapCursor(...args),
}));

process.env.RESEND_API_KEY = 'test-key';
process.env.CRON_SECRET = 'secret-de-test';

const { GET } = await import('./route');

const DAY = 24 * 60 * 60 * 1000;

function request(secret = 'secret-de-test'): Request {
  return new Request('https://governance.brussels/api/cron/preorders-recap', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

beforeEach(() => {
  send.mockReset().mockResolvedValue({ data: { id: 'e1' }, error: null });
  listPreordersBetween.mockReset().mockResolvedValue([]);
  readRecapCursor.mockReset().mockResolvedValue(null);
  saveRecapCursor.mockReset().mockResolvedValue(undefined);
});

describe('GET /api/cron/preorders-recap', () => {
  it('refuse un appel sans le secret cron', async () => {
    const res = await GET(request('mauvais-secret'));

    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it('interroge les sept derniers jours au tout premier passage', async () => {
    // L'assertion d'origine comparait `before - since` à exactement 7 jours,
    // ce qui n'est vrai que si le Date.now() du test et celui de la route
    // tombent dans la MÊME milliseconde : rouge au hasard en CI. On encadre.
    const before = Date.now();
    await GET(request());
    const after = Date.now();

    const [since, until] = listPreordersBetween.mock.calls[0] as number[];
    expect(since).toBeGreaterThanOrEqual(before - 7 * DAY);
    expect(since).toBeLessThanOrEqual(after - 7 * DAY);
    expect(until - since).toBe(7 * DAY);
  });

  it('reprend au curseur du récap précédent, pas à maintenant moins sept jours', async () => {
    // 169 h : l'écart réel entre deux mardis au passage à l'heure d'hiver.
    const cursor = Date.now() - 169 * 60 * 60 * 1000;
    readRecapCursor.mockResolvedValue(cursor);

    await GET(request());

    expect(listPreordersBetween.mock.calls[0][0]).toBe(cursor);
  });

  it("avance le curseur jusqu'à la fin de la période, après l'envoi", async () => {
    await GET(request());

    const until = listPreordersBetween.mock.calls[0][1];
    expect(saveRecapCursor).toHaveBeenCalledWith(until);
    expect(saveRecapCursor.mock.invocationCallOrder[0]).toBeGreaterThan(
      send.mock.invocationCallOrder[0],
    );
  });

  it("ne bouge pas le curseur quand l'envoi échoue", async () => {
    // Sinon la période du mail perdu ne serait plus jamais couverte.
    send.mockResolvedValue({ data: null, error: { message: 'boom' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await GET(request());

    expect(saveRecapCursor).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('ne bouge pas le curseur quand le journal est illisible', async () => {
    listPreordersBetween.mockRejectedValue(new Error('database is locked'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await GET(request());

    expect(saveRecapCursor).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('envoie quand même, et le dit, quand le curseur est illisible', async () => {
    readRecapCursor.mockRejectedValue(new Error('database is locked'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(send).toHaveBeenCalled();
    expect(send.mock.calls[0][0].html).toContain('journal est illisible');
    expect(saveRecapCursor).not.toHaveBeenCalled();
    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });

  it("signale en 500 un curseur qui n'a pas pu être enregistré", async () => {
    saveRecapCursor.mockRejectedValue(new Error('disk full'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(send).toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(errors.mock.calls.flat().join(' ')).toContain('preorders-recap-FAIL');
    errors.mockRestore();
  });

  it('liste prénom et email de chaque personne de la semaine', async () => {
    listPreordersBetween.mockResolvedValue([
      { email: 'alixe@example.be', firstName: 'Alixe', created_at: Date.now() },
      { email: 'marc@example.be', firstName: 'Marc', created_at: Date.now() },
    ]);

    await GET(request());

    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('contact@brusselsgovernance.be');
    expect(mail.html).toContain('alixe@example.be');
    expect(mail.html).toContain('Alixe');
    expect(mail.html).toContain('marc@example.be');
    expect(mail.html).toContain('Marc');
    expect(mail.subject).toContain('2');
  });

  it('part quand même sur une semaine sans aucune précommande', async () => {
    listPreordersBetween.mockResolvedValue([]);

    const res = await GET(request());

    expect(send).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(send.mock.calls[0][0].subject).toContain('0');
  });

  it('envoie quand même quand le journal est illisible, sinon la panne se cache', async () => {
    // Le mail EST le détecteur de panne. S'il disparaît quand le journal
    // casse, un journal cassé produit le même silence qu'une semaine calme :
    // exactement la récidive du sinistre d'avril, dans le garde-fou.
    listPreordersBetween.mockRejectedValue(new Error('database is locked'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(send).toHaveBeenCalled();
    // Assertion volontairement précise : /journal/ seul matcherait déjà la
    // note de provenance en pied de mail, ce serait un faux vert.
    expect(send.mock.calls[0][0].html).toContain('journal est illisible');
    expect(send.mock.calls[0][0].subject).toContain('illisible');
    // 500 pour que systemd et journald enregistrent l'échec du cron.
    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });

  it('neutralise le HTML dans un prénom', async () => {
    listPreordersBetween.mockResolvedValue([
      {
        email: 'x@example.be',
        firstName: '<a href="https://evil.example">Payer</a>',
        created_at: Date.now(),
      },
    ]);

    await GET(request());

    const html = send.mock.calls[0][0].html;
    expect(html).not.toContain('<a href="https://evil.example"');
    expect(html).toContain('&lt;a href=');
  });

  it('se protège du mode sombre, comme le digest', async () => {
    await GET(request());

    const html = send.mock.calls[0][0].html;
    expect(html).toContain('color-scheme');
    expect(html).toContain('only light');
  });

  it('empile date, prénom et adresse au lieu d’un tableau à trois colonnes', async () => {
    // Le tableau à trois colonnes débordait sous 441 px de large. Chaque
    // précommande tient désormais dans une seule cellule, champs empilés.
    listPreordersBetween.mockResolvedValue([
      {
        email: 'une.adresse.vraiment.tres.longue@exemple-de-domaine.be',
        firstName: 'Nathalie',
        created_at: Date.parse('2026-09-16T10:00:00Z'),
      },
    ]);

    await GET(request());

    const html: string = send.mock.calls[0][0].html;
    expect(html).not.toContain('<th');
    // Aucune ligne de tableau, mise en page comprise, n'ouvre plus d'une
    // cellule avant la ligne suivante.
    for (const row of html.split(/<tr[\s>]/).slice(1)) {
      expect(row.match(/<td[\s>]/g)?.length ?? 0).toBeLessThanOrEqual(1);
    }
    // Ordre de lecture : date en petit gris, prénom en gras, adresse dessous.
    const date = html.indexOf('16/09');
    const name = html.indexOf('Nathalie');
    const email = html.indexOf('une.adresse.vraiment');
    expect(date).toBeGreaterThan(-1);
    expect(date).toBeLessThan(name);
    expect(name).toBeLessThan(email);
    // Une adresse longue se coupe au lieu d'élargir le mail.
    expect(html).toMatch(/word-break:break-all;"><a href="mailto:une\.adresse/);
  });

  it('indique la période réellement couverte', async () => {
    // Après un rattrapage, la période ne fait pas sept jours : le mail le dit.
    // Pas d'horloge simulée ici : resendCall espace ses appels d'après
    // Date.now(), une horloge déplacée ferait attendre les tests suivants.
    readRecapCursor.mockResolvedValue(Date.parse('2026-09-01T07:00:00Z'));

    await GET(request());

    // Le séparateur entre date et heure dépend de la version d'ICU : on ne
    // verrouille que les valeurs, en heure de Bruxelles.
    expect(send.mock.calls[0][0].html).toMatch(
      /Du 01\/09\D+09:00 au \d\d\/\d\d\D+\d\d:\d\d/,
    );
  });

  it('n’utilise pas une couleur de texte sous le seuil AA', async () => {
    await GET(request());

    // #9ca3af mesure 2,54:1 sur blanc. #6b7280 passe à 4,83:1.
    expect(send.mock.calls[0][0].html).not.toContain('#9ca3af');
  });

  it("remonte un échec d'envoi en 500, pour que le cron le signale", async () => {
    send.mockResolvedValue({ data: null, error: { message: 'boom' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(request());

    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });
});
