import { describe, expect, it } from 'vitest';
import { PERMISSIONS, can, ROLES, PERSONAL_FIELDS } from './schema';

describe('matrice de permissions', () => {
  it('refuse par défaut : un rôle sans droit explicite est rejeté', () => {
    expect(can(['ANALYST'], 'artists.write')).toBe(false);
    expect(can([], 'artists.read')).toBe(false);
  });

  it('accorde ce que la matrice déclare', () => {
    expect(can(['CURATOR'], 'artists.write')).toBe(true);
    expect(can(['ANALYST'], 'artists.read')).toBe(true);
  });

  it('cumule les rôles', () => {
    expect(can(['ANALYST', 'EDITOR'], 'works.publish')).toBe(true);
  });

  it('réserve l\'effacement RGPD au seul SUPER_ADMIN', () => {
    expect(PERMISSIONS['people.erase']).toEqual(['SUPER_ADMIN']);
  });

  it('n\'accorde aucune opération à un rôle inconnu', () => {
    // @ts-expect-error rôle hors de la liste fermée
    expect(can(['PIRATE'], 'artists.read')).toBe(false);
  });

  it('couvre tous les rôles déclarés dans au moins une opération', () => {
    const cited = new Set(Object.values(PERMISSIONS).flat());
    for (const role of ROLES) expect(cited.has(role)).toBe(true);
  });

  it('classe email et nom légal comme personnels', () => {
    expect(PERSONAL_FIELDS.has('email')).toBe(true);
    expect(PERSONAL_FIELDS.has('legal_name')).toBe(true);
    expect(PERSONAL_FIELDS.has('crm_status')).toBe(false);
  });
});
