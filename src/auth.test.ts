import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { authorizeAdmin } from './auth';

const MDP = 'un-mot-de-passe-de-test-1234';
let hash: string;

beforeEach(async () => {
  hash = await bcrypt.hash(MDP, 10);
  vi.stubEnv('ADMIN_EMAIL', 'admin@bgm.be');
  vi.stubEnv('ADMIN_PASSWORD_HASH', hash);
});

describe('authorizeAdmin', () => {
  it('accepte les bons identifiants', async () => {
    const u = await authorizeAdmin('admin@bgm.be', MDP, '203.0.113.1');
    expect(u?.email).toBe('admin@bgm.be');
  });

  it('refuse un mauvais mot de passe', async () => {
    expect(await authorizeAdmin('admin@bgm.be', 'faux', '203.0.113.2')).toBeNull();
  });

  it('refuse une adresse inconnue', async () => {
    expect(await authorizeAdmin('inconnu@ailleurs.be', MDP, '203.0.113.3')).toBeNull();
  });

  /* LE TEST QUI COMPTE : L'ORACLE D'ÉNUMÉRATION.
     Avant ce durcissement, une adresse inconnue revenait en moins d'une
     milliseconde et la bonne adresse coûtait un bcrypt entier. La différence se
     mesure à distance et révèle l'adresse de l'administrateur. On ne teste pas
     que le code « a l'air constant » : on CHRONOMÈTRE les deux chemins. */
  it('ne distingue pas une adresse inconnue d’un mauvais mot de passe, à la durée', async () => {
    const mesurer = async (email: string, ip: string) => {
      const t0 = performance.now();
      await authorizeAdmin(email, 'faux', ip);
      return performance.now() - t0;
    };
    const inconnue = await mesurer('inconnu@ailleurs.be', '203.0.113.4');
    const connue = await mesurer('admin@bgm.be', '203.0.113.5');
    expect(inconnue).toBeGreaterThan(300);
    expect(connue).toBeGreaterThan(300);
    expect(Math.abs(inconnue - connue)).toBeLessThan(120);
  });

  /* LE LIMITEUR NE DOIT COMPTER QUE LES ÉCHECS.
     Il incrémentait avant toute vérification, donc aussi sur les connexions
     réussies : après cinq connexions légitimes dans la fenêtre de quinze
     minutes, l'administrateur se bloquait lui-même. Dix succès d'affilée depuis
     la même adresse doivent tous passer. */
  /* Six tentatives, une de plus que le plafond de cinq : c'est exactement la
     sixième que l'ancienne version refusait. Chaque appel tient le plancher de
     600 ms, d'où le délai relevé. */
  it('ne bloque pas l’administrateur après plusieurs connexions réussies', async () => {
    for (let essai = 0; essai < 6; essai++) {
      const u = await authorizeAdmin('admin@bgm.be', MDP, '203.0.113.20');
      expect(u?.email, `connexion réussie n°${essai + 1} refusée`).toBe('admin@bgm.be');
    }
  }, 15_000);

  /* Et il doit toujours bloquer ce pour quoi il existe : le bourrage. */
  it('bloque après cinq échecs depuis la même adresse', async () => {
    const ip = '203.0.113.21';
    for (let essai = 0; essai < 5; essai++) {
      expect(await authorizeAdmin('admin@bgm.be', 'faux', ip)).toBeNull();
    }
    // Sixième tentative : même avec le BON mot de passe, l'adresse est écartée.
    expect(await authorizeAdmin('admin@bgm.be', MDP, ip)).toBeNull();
    // Une autre adresse n'est pas affectée.
    expect((await authorizeAdmin('admin@bgm.be', MDP, '203.0.113.22'))?.email).toBe('admin@bgm.be');
  });

  /* Le plancher vaut AUSSI quand la configuration manque : sans lui, un serveur
     mal configuré répondrait instantanément et se signalerait comme tel. */
  it('tient le plancher même sans variables d’environnement', async () => {
    vi.stubEnv('ADMIN_EMAIL', '');
    vi.stubEnv('ADMIN_PASSWORD_HASH', '');
    const t0 = performance.now();
    expect(await authorizeAdmin('admin@bgm.be', MDP, '203.0.113.6')).toBeNull();
    expect(performance.now() - t0).toBeGreaterThan(300);
  });
});
