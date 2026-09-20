// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));

import { readFile } from 'node:fs/promises';
import { readSeoReport } from './seo-report';

beforeAll(() => {
  // Meme mecanisme que traffic-status.ts : le repertoire est deduit de
  // DB_PATH. En dehors du VPS (dev local, CI) la variable est absente ;
  // ici on la fixe pour exercer le chemin de lecture avec fs mocke.
  process.env.DB_PATH = '/opt/bgm/data/db.sqlite';
});

describe('readSeoReport', () => {
  it("refuse un schéma inconnu au lieu d'afficher des zéros", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ schemaVersion: 99, status: 'ok', donnees: {} }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.status).toBe('format-inconnu');
    expect(rapport.blocs.gsc.donnees).toBeNull();
  });

  it('traite un fichier absent comme une panne, pas comme un rapport vide', async () => {
    vi.mocked(readFile).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    expect((await readSeoReport()).blocs.umami.status).toBe('absent');
  });

  it('rejette NaN et Infinity rendus en chaîne par Postgres', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { visites: 'NaN', profondeur: 'Infinity' },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.visites).toBeNull();
    expect(rapport.blocs.umami.donnees?.profondeur).toBeNull();
  });

  it('rend un statut inconnu illisible plutôt que de le propager', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ schemaVersion: 1, bloc: 'crawl', status: 'en-cours', donnees: {} }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('format-inconnu');
  });

  it('rend un bloc technique bloqué lisible sans planter (donnees: null)', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'blocked',
        message: 'sonde bloquée par Cloudflare',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: null,
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('blocked');
    expect(rapport.blocs.crawl.donnees).toBeNull();
    expect(rapport.blocs.crawl.message).toBe('sonde bloquée par Cloudflare');
  });

  it('retient une action complète, dans la forme que produit regles.mjs', async () => {
    // Forme réelle décidée après relecture : regles.mjs porte désormais un
    // `url` explicite sur chaque action (regle, priorite, titre, url,
    // preuve, fenetre), une action non cliquable ne servant à rien.
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          actions: [
            {
              regle: 'page-en-erreur',
              priorite: 1,
              titre: 'Page en erreur : /fr/x',
              url: '/fr/x',
              preuve: 'statut HTTP 500',
              fenetre: { debut: '2026-08-20', fin: '2026-09-16' },
            },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.actions).toEqual([
      {
        regle: 'page-en-erreur',
        url: '/fr/x',
        preuve: 'statut HTTP 500',
        titre: 'Page en erreur : /fr/x',
        priorite: 1,
        fenetre: { debut: '2026-08-20', fin: '2026-09-16', fuseau: null },
      },
    ]);
  });

  it("écarte une action sans url plutôt que d'afficher une tuile vide en silence", async () => {
    // Verrou de régression : si l'amont (regles.mjs) cessait un jour de
    // fournir `url`, ce test doit rougir plutôt que de laisser passer une
    // action non cliquable sans que personne ne le remarque.
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          actions: [
            {
              regle: 'page-en-erreur',
              priorite: 1,
              titre: 'Page en erreur : /fr/x',
              preuve: 'statut HTTP 500',
              fenetre: { debut: '2026-08-20', fin: '2026-09-16' },
            },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.actions).toHaveLength(0);
  });

  it('calcule la fraîcheur de chaque bloc avec le seuil de 8 jours', async () => {
    const ilYA9Jours = new Date(Date.now() - 9 * 24 * 3_600_000).toISOString();
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: ilYA9Jours,
        donnees: {},
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.fraicheur.gsc?.level).toBe('stale');
  });

  it('expose le scriptSha256 de chaque bloc, ou null si absent', async () => {
    const empreinte = 'a'.repeat(64);
    vi.mocked(readFile).mockImplementation(async (chemin) => {
      const nom = String(chemin).includes('seo-gsc.json') ? 'gsc' : 'autre';
      return JSON.stringify({
        // gsc = version 3, umami = version 2 : deux versions différentes,
        // jamais une seule partagée entre les deux blocs.
        schemaVersion: nom === 'gsc' ? 3 : 2,
        bloc: nom === 'gsc' ? 'gsc' : 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        // Seul le bloc GSC porte une empreinte dans ce test : le VPS peut
        // déployer un script plus vieux que le dépôt pour un seul bloc.
        scriptSha256: nom === 'gsc' ? empreinte : undefined,
        donnees: {},
      });
    });
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.scriptSha256).toBe(empreinte);
    expect(rapport.blocs.umami.scriptSha256).toBeNull();
  });

  it('rend illisible un fichier dont le champ bloc ne correspond pas, jamais de chiffres empruntés à un autre bloc', async () => {
    // seo-gsc.json et seo-crawl.json contiennent tous deux un bloc qui se
    // déclare "umami" (fichiers mélangés, script en panne à mi-écriture) :
    // ni l'un ni l'autre ne doit être lu comme s'il portait les bons chiffres.
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { visites: 4200 },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.status).toBe('format-inconnu');
    expect(rapport.blocs.gsc.donnees).toBeNull();
    expect(rapport.blocs.crawl.status).toBe('format-inconnu');
    expect(rapport.blocs.crawl.donnees).toBeNull();
    expect(rapport.blocs.umami.status).toBe('ok');
    expect(rapport.blocs.umami.donnees?.visites).toBe(4200);
  });

  it('lit pagesEntree comme un tableau { chemin, visites, visitesIa }', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          pagesEntree: [{ chemin: '/fr/dossiers/lez', visites: 420, visitesIa: 97 }],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.pagesEntree).toEqual([
      { chemin: '/fr/dossiers/lez', visites: 420, visitesIa: 97 },
    ]);
  });

  it("écarte une entrée de pagesEntree sans chemin, mais rend les visites null sans l'écarter si elles ne sont pas un nombre", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          pagesEntree: [
            { visites: 100, visitesIa: 10 }, // pas de chemin : écartée
            { chemin: '/fr/dossiers/acs', visites: 'NaN', visitesIa: 'Infinity' },
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    const pages = rapport.blocs.umami.donnees?.pagesEntree ?? [];
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ chemin: '/fr/dossiers/acs', visites: null, visitesIa: null });
  });

  it('ne plante pas quand pagesEntree est absent ou du mauvais type', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { pagesEntree: 'pas-un-tableau' },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.pagesEntree).toEqual([]);
  });

  it("rejette un evenements non entier (chaîne, décimal) au lieu d'un zéro inventé", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { evenements: '12' },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.evenements).toBeNull();
  });

  it("rejette un evenements decimal, un comptage n'étant jamais une fraction", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { evenements: 4.5 },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.evenements).toBeNull();
  });

  it('lit la fenêtre au premier niveau du bloc, avec son fuseau (contrat commun)', async () => {
    // Le contrat JSON commun (contraintes-globales.md) impose `fenetre` au
    // premier niveau de CHAQUE fichier, pas seulement dans `donnees` du
    // bloc GSC : Search Console est en heure du Pacifique, Umami en UTC.
    vi.mocked(readFile).mockImplementation(async (chemin) => {
      const nom = String(chemin).includes('seo-gsc.json') ? 'gsc' : 'umami';
      return JSON.stringify({
        // gsc = version 3, umami = version 2 : deux versions différentes.
        schemaVersion: nom === 'gsc' ? 3 : 2,
        bloc: nom,
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        fenetre:
          nom === 'gsc'
            ? { debut: '2026-08-24', fin: '2026-09-20', fuseau: 'America/Los_Angeles' }
            : { debut: '2026-08-24', fin: '2026-09-20', fuseau: 'UTC' },
        donnees: {},
      });
    });
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.fenetre).toEqual({
      debut: '2026-08-24',
      fin: '2026-09-20',
      fuseau: 'America/Los_Angeles',
    });
    expect(rapport.blocs.umami.fenetre).toEqual({
      debut: '2026-08-24',
      fin: '2026-09-20',
      fuseau: 'UTC',
    });
  });

  it("rend la fenêtre d'un bloc null quand elle est absente, jamais une date inventée", async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {},
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.fenetre).toBeNull();
  });

  it('lit la fenêtre même quand le bloc est en panne ou bloqué (elle décrit la période visée, pas le succès)', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'blocked',
        message: 'sonde bloquée par Cloudflare',
        generatedAt: '2026-09-21T04:30:00Z',
        fenetre: { debut: '2026-08-24', fin: '2026-09-20', fuseau: 'UTC' },
        donnees: null,
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('blocked');
    expect(rapport.blocs.crawl.fenetre).toEqual({
      debut: '2026-08-24',
      fin: '2026-09-20',
      fuseau: 'UTC',
    });
  });

  it('lit evenements comme un entier valide', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { evenements: 12 },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.evenements).toBe(12);
  });

  // La requête SQL de bloc-umami.mjs rend visitesIa via COALESCE(..., '[]')
  // quand aucune ligne ne correspond : un tableau vide est une absence de
  // visites CONSTATÉE (un vrai zéro), pas une absence de mesure. Le champ
  // absent ou du mauvais type reste, lui, une donnée manquante : les deux
  // cas doivent rester distincts après lecture, jamais confondus.
  it("distingue visitesIa absent (donnée manquante) d'un tableau vide (zéro constaté)", async () => {
    vi.mocked(readFile).mockImplementation(async () =>
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {}, // visitesIa absent du JSON
      }),
    );
    const rapport1 = await readSeoReport();
    expect(rapport1.blocs.umami.donnees?.visitesIa).toBeNull();

    vi.mocked(readFile).mockImplementation(async () =>
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { visitesIa: [] }, // COALESCE(..., '[]') côté SQL
      }),
    );
    const rapport2 = await readSeoReport();
    expect(rapport2.blocs.umami.donnees?.visitesIa).toEqual([]);
  });

  it('rend visitesIa null quand le champ est du mauvais type, jamais un tableau vide', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { visitesIa: 'pas-un-tableau' },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.visitesIa).toBeNull();
  });

  // Même principe pour le bloc crawl : `pages` est construit en mémoire par
  // le script (deploy/seo-report/bloc-crawl côté ops), pas par une requête
  // SQL, mais la même règle s'applique dès qu'on en affiche un total : un
  // tableau absent ou du mauvais type reste une donnée manquante, un
  // tableau vide reste un zéro constaté.
  it("distingue pages absent (donnée manquante) d'un tableau vide (zéro page constatée)", async () => {
    vi.mocked(readFile).mockImplementation(async () =>
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {}, // pages absent du JSON
      }),
    );
    const rapport1 = await readSeoReport();
    expect(rapport1.blocs.crawl.donnees?.pages).toBeNull();

    vi.mocked(readFile).mockImplementation(async () =>
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { pages: [] },
      }),
    );
    const rapport2 = await readSeoReport();
    expect(rapport2.blocs.crawl.donnees?.pages).toEqual([]);
  });

  // La tuile et la page affichent la première action de la liste comme LA
  // priorité de la semaine : si la liste n'est pas triée, « la première
  // action » est celle que regles.mjs a écrite en premier, pas la plus
  // urgente.
  it('trie les actions par priorité croissante, les priorités absentes en fin de liste', async () => {
    function action(regle: string, priorite: number | null) {
      return { regle, priorite, titre: null, url: `/fr/${regle}`, preuve: 'preuve', fenetre: null };
    }
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          actions: [
            action('moyenne', 5),
            action('sans-priorite', null),
            action('urgente', 1),
            action('intermediaire', 3),
          ],
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.actions.map((a) => a.regle)).toEqual([
      'urgente',
      'intermediaire',
      'moyenne',
      'sans-priorite',
    ]);
  });

  // Red team (2026-09-20) : rendu vérifié avec des valeurs corrompues
  // (« −50 » clics, « −9 » événements, CTR 4 200 %, profondeur 500 %,
  // position −3,0). Une valeur impossible par définition (compte négatif,
  // pourcentage au-dessus de cent, position négative) ne peut signifier
  // qu'une corruption : traitée comme NaN, donnée absente, jamais affichée
  // telle quelle.
  it('rejette un compte négatif (clics, impressions, clicsBelgique) comme une corruption', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          totaux: { clics: -50, impressions: -1, ctr: 0.1, position: 3 },
          clicsBelgique: -50,
        },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.totaux.clics).toBeNull();
    expect(rapport.blocs.gsc.donnees?.totaux.impressions).toBeNull();
    expect(rapport.blocs.gsc.donnees?.clicsBelgique).toBeNull();
    // Une mesure plausible dans le même objet reste affichée.
    expect(rapport.blocs.gsc.donnees?.totaux.ctr).toBe(0.1);
  });

  it('rejette un evenements négatif, même entier, jamais affiché tel quel', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { evenements: -9 },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.umami.donnees?.evenements).toBeNull();
  });

  it('rejette un pourcentage au-dessus de cent (CTR, profondeur, part des requêtes)', async () => {
    vi.mocked(readFile).mockImplementation(async () =>
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {
          totaux: { clics: 10, impressions: 100, ctr: 42, position: 3 },
          partRequetes: 5,
        },
      }),
    );
    const rapportGsc = await readSeoReport();
    expect(rapportGsc.blocs.gsc.donnees?.totaux.ctr).toBeNull();
    expect(rapportGsc.blocs.gsc.donnees?.partRequetes).toBeNull();
    // Le reste du même objet, plausible, reste affiché.
    expect(rapportGsc.blocs.gsc.donnees?.totaux.clics).toBe(10);

    vi.mocked(readFile).mockImplementation(async () =>
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { profondeur: 5 },
      }),
    );
    const rapportUmami = await readSeoReport();
    expect(rapportUmami.blocs.umami.donnees?.profondeur).toBeNull();
  });

  it('rejette une position de classement négative', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { totaux: { clics: 10, impressions: 100, ctr: 0.1, position: -3 } },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.totaux.position).toBeNull();
  });

  // « Ne borne pas ce qui est seulement surprenant » : un chiffre énorme
  // mais positif n'est pas impossible par définition, il reste affiché.
  it('affiche un chiffre positif inhabituel mais possible sans le borner', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: { totaux: { clics: 10, impressions: 1e308, ctr: 0.1, position: 3 } },
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.donnees?.totaux.impressions).toBe(1e308);
  });

  // --- Contrat commun, versions PAR BLOC (referents Umami, publieRecemment /
  // requetesEmergentes Search Console) : gsc = 3, umami = 2, crawl = 1 (non
  // touché). Trois valeurs différentes, chacune pour son bloc : les
  // confondre rendrait un bloc entier illisible dès le premier passage réel.
  // -----------------------------------------------------------------------

  it('accepte schemaVersion 3 pour le bloc gsc et schemaVersion 2 pour le bloc umami', async () => {
    vi.mocked(readFile).mockImplementation(async (chemin) => {
      const nom = String(chemin).includes('seo-gsc.json') ? 'gsc' : 'umami';
      return JSON.stringify({
        schemaVersion: nom === 'gsc' ? 3 : 2,
        bloc: nom,
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {},
      });
    });
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.status).toBe('ok');
    expect(rapport.blocs.umami.status).toBe('ok');
  });

  // Verrou de régression explicite : le bloc GSC est passé de la version 2 à
  // la version 3 (publieRecemment devient { liste, total }) ; un fichier
  // resté à la version 2 pour ce bloc (script pas encore redéployé) doit
  // désormais se lire illisible, jamais deviné compatible.
  it('rejette désormais schemaVersion 2 pour le bloc gsc, périmé depuis le passage à la version 3', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 2,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {},
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.status).toBe('format-inconnu');
  });

  // Verrou de régression explicite : le contrat est figé, un fichier resté
  // en version 1 (script non redéployé) doit se lire illisible plutôt que
  // d'être accepté à tort, pour gsc comme pour umami.
  it("rejette désormais schemaVersion 1 pour gsc et umami, c'est le format périmé", async () => {
    vi.mocked(readFile).mockImplementation(async (chemin) => {
      const nom = String(chemin).includes('seo-gsc.json') ? 'gsc' : 'umami';
      return JSON.stringify({
        schemaVersion: 1,
        bloc: nom,
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {},
      });
    });
    const rapport = await readSeoReport();
    expect(rapport.blocs.gsc.status).toBe('format-inconnu');
    expect(rapport.blocs.umami.status).toBe('format-inconnu');
  });

  it('continue à accepter schemaVersion 1 pour le passage technique, non touché par ce changement', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        schemaVersion: 1,
        bloc: 'crawl',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees: {},
      }),
    );
    const rapport = await readSeoReport();
    expect(rapport.blocs.crawl.status).toBe('ok');
  });

  describe('referents (bloc Umami v2)', () => {
    function umamiV2(donnees: unknown) {
      return JSON.stringify({
        schemaVersion: 2,
        bloc: 'umami',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees,
      });
    }

    // Cas central du contrat : le total n'est pas la somme de la liste
    // (plafonnée à 10 côté producteur). Une liste dont la somme diffère
    // volontairement du total prouve que le lecteur restitue le total tel
    // quel, sans le recalculer.
    it('lit le total des moteurs hors Google tel quel, jamais recalculé à partir de la liste plafonnée', async () => {
      vi.mocked(readFile).mockResolvedValue(
        umamiV2({
          referents: {
            moteursHorsGoogle: {
              liste: [
                { source: 'bing.com', visites: 40 },
                { source: 'duckduckgo.com', visites: 10 },
              ],
              total: 9999, // volontairement très différent de 40 + 10
            },
            canauxFermes: [],
            sitesReferents: [],
            campagnes: [],
            sansReferent: 100,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.umami.donnees?.referents?.moteursHorsGoogle.total).toBe(9999);
      expect(rapport.blocs.umami.donnees?.referents?.moteursHorsGoogle.liste).toEqual([
        { source: 'bing.com', visites: 40 },
        { source: 'duckduckgo.com', visites: 10 },
      ]);
    });

    it('rend referents null quand la mesure est absente, jamais un objet aux listes vides', async () => {
      vi.mocked(readFile).mockResolvedValue(umamiV2({})); // referents absent du JSON
      const rapport = await readSeoReport();
      expect(rapport.blocs.umami.donnees?.referents).toBeNull();
    });

    it('distingue referents absent (null) de sous-listes présentes mais vides ([])', async () => {
      vi.mocked(readFile).mockResolvedValue(
        umamiV2({
          referents: {
            moteursHorsGoogle: { liste: [], total: 0 },
            canauxFermes: [],
            sitesReferents: [],
            campagnes: [],
            sansReferent: 0,
          },
        }),
      );
      const rapport = await readSeoReport();
      const referents = rapport.blocs.umami.donnees?.referents;
      expect(referents).not.toBeNull();
      expect(referents?.sitesReferents).toEqual([]);
      expect(referents?.canauxFermes).toEqual([]);
      expect(referents?.campagnes).toEqual([]);
      expect(referents?.moteursHorsGoogle.liste).toEqual([]);
    });

    it('lit sansReferent comme un nombre, jamais une liste', async () => {
      vi.mocked(readFile).mockResolvedValue(
        umamiV2({
          referents: {
            moteursHorsGoogle: { liste: [], total: 0 },
            canauxFermes: [],
            sitesReferents: [],
            campagnes: [],
            sansReferent: 4200,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.umami.donnees?.referents?.sansReferent).toBe(4200);
    });

    it('lit sitesReferents, canauxFermes et campagnes comme des listes { source, visites }', async () => {
      vi.mocked(readFile).mockResolvedValue(
        umamiV2({
          referents: {
            moteursHorsGoogle: { liste: [], total: 0 },
            canauxFermes: [{ source: 'outlook.office.com', visites: 3 }],
            sitesReferents: [{ source: 'lesoir.be', visites: 88 }],
            campagnes: [{ source: 'newsletter', visites: 250 }],
            sansReferent: 10,
          },
        }),
      );
      const rapport = await readSeoReport();
      const referents = rapport.blocs.umami.donnees?.referents;
      expect(referents?.canauxFermes).toEqual([{ source: 'outlook.office.com', visites: 3 }]);
      expect(referents?.sitesReferents).toEqual([{ source: 'lesoir.be', visites: 88 }]);
      expect(referents?.campagnes).toEqual([{ source: 'newsletter', visites: 250 }]);
    });

    it('écarte une entrée sans source, sans planter le reste de la liste', async () => {
      vi.mocked(readFile).mockResolvedValue(
        umamiV2({
          referents: {
            moteursHorsGoogle: { liste: [], total: 0 },
            canauxFermes: [],
            sitesReferents: [{ visites: 5 }, { source: 'lesoir.be', visites: 88 }],
            campagnes: [],
            sansReferent: 0,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.umami.donnees?.referents?.sitesReferents).toEqual([
        { source: 'lesoir.be', visites: 88 },
      ]);
    });

    it('lit visitesParChemin sans plafond, à usage interne', async () => {
      vi.mocked(readFile).mockResolvedValue(
        umamiV2({
          visitesParChemin: [
            { chemin: '/fr/dossiers/lez', visites: 420 },
            { chemin: '/fr/dossiers/acs', visites: 12 },
          ],
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.umami.donnees?.visitesParChemin).toEqual([
        { chemin: '/fr/dossiers/lez', visites: 420 },
        { chemin: '/fr/dossiers/acs', visites: 12 },
      ]);
    });

    it('rend visitesParChemin vide quand absent, sans planter', async () => {
      vi.mocked(readFile).mockResolvedValue(umamiV2({}));
      const rapport = await readSeoReport();
      expect(rapport.blocs.umami.donnees?.visitesParChemin).toEqual([]);
    });
  });

  describe('publieRecemment et requetesEmergentes (bloc GSC v3)', () => {
    function gscV3(donnees: unknown) {
      return JSON.stringify({
        schemaVersion: 3,
        bloc: 'gsc',
        status: 'ok',
        generatedAt: '2026-09-21T04:30:00Z',
        donnees,
      });
    }

    // Forme réelle décidée après le premier passage sur données réelles
    // (144 pages publiées dans la fenêtre) : `publieRecemment` est un objet
    // { liste, total }, jamais un tableau brut. La liste est plafonnée à 15
    // côté producteur, les zéros en tête ; `total` dit l'ampleur réelle
    // (144), que le plafond de la liste ne doit jamais cacher.
    it('lit publieRecemment comme { liste, total }, jamais un tableau brut', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({
          publieRecemment: {
            liste: [
              {
                chemin: '/fr/dossiers/nouveau',
                datePublication: '2026-09-18',
                clics: 0,
                impressions: 0,
                visitesUmami: 5,
              },
            ],
            total: 144,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.publieRecemment).toEqual({
        liste: [
          {
            chemin: '/fr/dossiers/nouveau',
            datePublication: '2026-09-18',
            clics: 0,
            impressions: 0,
            visitesUmami: 5,
          },
        ],
        total: 144,
      });
    });

    // Cas central : un zéro constaté (page publiée sans le moindre clic) doit
    // rester un vrai zéro affichable, jamais confondu avec une donnée
    // manquante.
    it('lit un zéro constaté (clics, impressions) comme un vrai zéro, pas une donnée absente', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({
          publieRecemment: {
            liste: [
              {
                chemin: '/fr/dossiers/nouveau',
                datePublication: '2026-09-18',
                clics: 0,
                impressions: 0,
                visitesUmami: 5,
              },
            ],
            total: 1,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.publieRecemment.liste).toEqual([
        {
          chemin: '/fr/dossiers/nouveau',
          datePublication: '2026-09-18',
          clics: 0,
          impressions: 0,
          visitesUmami: 5,
        },
      ]);
    });

    // Le total n'est PAS la longueur de la liste, plafonnée à 15 : une
    // liste courte dont le total diffère volontairement prouve que le
    // lecteur restitue le total tel quel, sans le recalculer.
    it('lit le total tel quel, jamais recalculé à partir de la longueur de la liste plafonnée', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({
          publieRecemment: {
            liste: [
              {
                chemin: '/fr/a',
                datePublication: '2026-09-18',
                clics: 0,
                impressions: 0,
                visitesUmami: 0,
              },
            ],
            total: 144,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.publieRecemment.total).toBe(144);
      expect(rapport.blocs.gsc.donnees?.publieRecemment.liste).toHaveLength(1);
    });

    // Cas central : visitesUmami peut valoir null (bloc Umami en panne cette
    // semaine-là), distinct d'un zéro constaté.
    it('lit visitesUmami null comme une mesure indisponible, distincte du zéro', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({
          publieRecemment: {
            liste: [
              {
                chemin: '/fr/dossiers/nouveau',
                datePublication: '2026-09-18',
                clics: 3,
                impressions: 40,
                visitesUmami: null,
              },
            ],
            total: 1,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.publieRecemment.liste[0].visitesUmami).toBeNull();
      expect(rapport.blocs.gsc.donnees?.publieRecemment.liste[0].clics).toBe(3);
    });

    it('rend publieRecemment { liste: [], total: null } quand absent ou du mauvais type, sans planter', async () => {
      vi.mocked(readFile).mockResolvedValue(gscV3({ publieRecemment: 'pas-un-objet' }));
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.publieRecemment).toEqual({ liste: [], total: null });
    });

    it('rend liste vide quand publieRecemment.liste est du mauvais type, sans planter', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({ publieRecemment: { liste: 'pas-un-tableau', total: 144 } }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.publieRecemment).toEqual({ liste: [], total: 144 });
    });

    it('écarte une entrée de publieRecemment.liste sans chemin', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({
          publieRecemment: {
            liste: [
              { datePublication: '2026-09-18', clics: 0, impressions: 0, visitesUmami: null },
            ],
            total: 1,
          },
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.publieRecemment.liste).toEqual([]);
    });

    it('lit requetesEmergentes comme { requete, impressions, impressionsPrecedentes, position }', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({
          requetesEmergentes: [
            {
              requete: 'permis environnement bruxelles',
              impressions: 30,
              impressionsPrecedentes: 0,
              position: 14.2,
            },
          ],
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.requetesEmergentes).toEqual([
        {
          requete: 'permis environnement bruxelles',
          impressions: 30,
          impressionsPrecedentes: 0,
          position: 14.2,
        },
      ]);
    });

    it('écarte une requête émergente sans texte de requête', async () => {
      vi.mocked(readFile).mockResolvedValue(
        gscV3({
          requetesEmergentes: [{ impressions: 30, impressionsPrecedentes: 0, position: 14.2 }],
        }),
      );
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.requetesEmergentes).toEqual([]);
    });

    it('rend requetesEmergentes vide quand absent, sans planter', async () => {
      vi.mocked(readFile).mockResolvedValue(gscV3({}));
      const rapport = await readSeoReport();
      expect(rapport.blocs.gsc.donnees?.requetesEmergentes).toEqual([]);
    });
  });

  // Red team (2026-09-20) : la tuile annonçait « Alertes techniques 0 »
  // pendant que la page listait des pages en 404/500 : le compte de la
  // tuile ne sommait que bloquées et échecs réseau, jamais les pages
  // récupérées avec un statut cassé. pagesCassees() est la fonction
  // partagée qui doit rendre ces deux affichages cohérents.
  describe('pagesCassees', () => {
    it('compte les pages dont le statut est connu et différent de 200, jamais celles au statut inconnu', async () => {
      const { pagesCassees } = await import('./seo-report');
      const pages = [
        { url: '/a', statut: 404, canonical: null, titre: null, description: null, hreflang: [] },
        { url: '/b', statut: 500, canonical: null, titre: null, description: null, hreflang: [] },
        { url: '/c', statut: 200, canonical: null, titre: null, description: null, hreflang: [] },
        { url: '/d', statut: null, canonical: null, titre: null, description: null, hreflang: [] },
      ];
      expect(pagesCassees(pages).map((p) => p.url)).toEqual(['/a', '/b']);
    });
  });
});
