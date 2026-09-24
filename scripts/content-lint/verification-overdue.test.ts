import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bilanEcheances } from '../../src/lib/verification-due';
import { formaterRapport, lireEntrees } from './verification-overdue-report';

/**
 * Le contrôle des vérifications en retard. Trois promesses, verrouillées ici :
 * un retard n'échoue JAMAIS (code 0) mais se voit, avec ses compteurs ; un OK
 * n'est jamais muet ; une valeur illisible ou future échoue (code 1).
 * « Aujourd'hui » est toujours fixé : aucune horloge réelle.
 */

const REPO = path.resolve(__dirname, '..', '..');

function fm(champs: Record<string, string | number>): string {
  const lignes = Object.entries(champs).map(([k, v]) => `${k}: ${typeof v === 'number' ? v : JSON.stringify(v)}`);
  return `---\n${lignes.join('\n')}\n---\n\nCorps.\n`;
}

describe('formaterRapport', () => {
  it('OK : imprime ses compteurs, jamais un silence', () => {
    const r = formaterRapport(bilanEcheances({ verifications: [], fiches: [], aujourdhui: '2026-09-24' }));
    expect(r.code).toBe(0);
    const texte = r.lignes.join('\n');
    expect(texte).toContain('0 fiche(s) vérifiée(s), 0 avec échéance, 0 en retard');
    expect(texte).toContain('0 fichier(s) avec lastVerified, 0 avec intervalle, 0 en retard');
    expect(texte).toContain('OK : aucune vérification en retard.');
  });

  it('retard : visible, compté, en avertissement, et ne bloque pas', () => {
    const bilan = bilanEcheances({
      verifications: [
        { fichier: 'v.fr.mdx', cardType: 'domain', cardSlug: 'budget', locale: 'fr', date: '2026-03-06', nextVerification: '2026-04-06' },
      ],
      fiches: [
        { fichier: 'content/dossiers/lez.fr.mdx', collection: 'dossier', slug: 'lez', locale: 'fr', lastVerified: '2026-06-01', verificationIntervalDays: '90' },
      ],
      aujourdhui: '2026-09-24',
    });
    const r = formaterRapport(bilan);
    expect(r.code).toBe(0);
    const texte = r.lignes.join('\n');
    expect(texte).toContain('ATTENTION : 2 vérification(s) en retard.');
    expect(texte).toMatch(/RETARD +171 j +domain\/budget/);
    expect(texte).toMatch(/RETARD +25 j +content\/dossiers\/lez\.fr\.mdx/);
    expect(r.avertissements).toHaveLength(2);
    expect(r.erreurs).toEqual([]);
  });

  it('valeur future ou illisible : échoue, avec le fichier', () => {
    const r = formaterRapport(
      bilanEcheances({
        verifications: [],
        fiches: [{ fichier: 'content/dossiers/x.fr.mdx', collection: 'dossier', slug: 'x', locale: 'fr', lastVerified: '2026-12-01', verificationIntervalDays: undefined }],
        aujourdhui: '2026-09-24',
      }),
    );
    expect(r.code).toBe(1);
    expect(r.erreurs[0].fichier).toBe('content/dossiers/x.fr.mdx');
    expect(r.lignes.join('\n')).toContain('FAIL : 1 valeur(s)');
  });
});

describe('lireEntrees (fichiers bruts)', () => {
  let racine: string;

  beforeAll(() => {
    racine = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-verif-'));
    for (const d of ['content/verifications', 'content/dossiers', 'content/domain-cards']) {
      fs.mkdirSync(path.join(racine, d), { recursive: true });
    }
    fs.writeFileSync(
      path.join(racine, 'content/verifications/budget-2026-03-06.fr.mdx'),
      fm({ cardType: 'domain', cardSlug: 'budget', locale: 'fr', date: '2026-03-06', nextVerification: '2026-04-06' }),
    );
    fs.writeFileSync(
      path.join(racine, 'content/dossiers/lez.fr.mdx'),
      fm({ slug: 'lez', locale: 'fr', title: 'LEZ', lastVerified: '2026-06-01', verificationIntervalDays: 90 }),
    );
    fs.writeFileSync(path.join(racine, 'content/dossiers/casse.fr.mdx'), '---\nslug: [\n---\n');
  });

  afterAll(() => fs.rmSync(racine, { recursive: true, force: true }));

  it('lit le registre et les fiches, et signale un frontmatter cassé au lieu de l’ignorer', () => {
    const e = lireEntrees(racine);
    expect(e.verifications).toHaveLength(1);
    expect(e.fiches.find((f) => f.slug === 'lez')).toMatchObject({ lastVerified: '2026-06-01', verificationIntervalDays: '90' });
    expect(e.illisibles.map((i) => i.fichier)).toEqual(['content/dossiers/casse.fr.mdx']);
  });

  it('lève si un répertoire attendu manque : un zéro sans lecture serait une panne muette', () => {
    const vide = fs.mkdtempSync(path.join(os.tmpdir(), 'bgm-verif-vide-'));
    try {
      expect(() => lireEntrees(vide)).toThrow();
    } finally {
      fs.rmSync(vide, { recursive: true, force: true });
    }
  });
});

describe('point d’entrée (dépôt réel, date fixée)', () => {
  const script = path.join(REPO, 'scripts/content-lint/verification-overdue.ts');

  it('sort en 0 et imprime ses compteurs, retard ou non', () => {
    // Le nombre de retards dépend du contenu : on vérifie la forme, pas un nombre mouvant.
    const sortie = execFileSync('npx', ['tsx', script, '--aujourdhui', '2026-09-24'], { cwd: REPO, encoding: 'utf8' });
    expect(sortie).toMatch(/Registre des vérifications : \d+ fiche\(s\) vérifiée\(s\), \d+ avec échéance, \d+ en retard\./);
    expect(sortie).toMatch(/Dossiers et domaines : \d+ fichier\(s\) avec lastVerified/);
    expect(sortie).toMatch(/OK : aucune vérification en retard\.|ATTENTION : \d+ vérification\(s\) en retard\./);
  });

  it('échoue fermé sur une date du jour illisible', () => {
    const r = spawnSync('npx', ['tsx', script, '--aujourdhui', 'demain'], { cwd: REPO, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('contrôle impossible');
  });
});
