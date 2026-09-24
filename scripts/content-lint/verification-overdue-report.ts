/**
 * scripts/content-lint/verification-overdue-report.ts
 *
 * Lecture des fichiers source et mise en forme du bilan des vérifications en
 * retard. Séparé du point d'entrée (verification-overdue.ts) pour être testé
 * sans lancer de processus ni lire l'horloge. La règle elle-même vit dans
 * src/lib/verification-due.ts, partagée avec l'écran /admin/relecture.
 */

import fs from 'node:fs';
import path from 'node:path';
import { FrontmatterError, readGuardFrontmatter } from '../../src/lib/frontmatter';
import type {
  BilanEcheances,
  EntreeFiche,
  EntreeVerification,
  ValeurInvalide,
} from '../../src/lib/verification-due';

export const DOSSIER_VERIFICATIONS = 'content/verifications';
export const DOSSIERS_FICHES = [
  { dir: 'content/dossiers', collection: 'dossier' },
  { dir: 'content/domain-cards', collection: 'domain' },
] as const;

export interface EntreesLues {
  verifications: EntreeVerification[];
  fiches: EntreeFiche[];
  /** Fichiers illisibles : signalés, jamais ignorés en silence. */
  illisibles: ValeurInvalide[];
}

function listerMdx(root: string, dir: string): string[] {
  const abs = path.join(root, dir);
  return fs
    .readdirSync(abs)
    .filter((n) => n.endsWith('.mdx'))
    .sort()
    .map((n) => `${dir}/${n}`);
}

/** Valeur scalaire en chaîne ; un tableau ou un objet sort tel quel en JSON
 * pour être signalé comme illisible plutôt que confondu avec une absence. */
function scalaire(data: Record<string, unknown>, cle: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(data, cle)) return undefined;
  const v = data[cle];
  if (v === null) return undefined;
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

/**
 * Lit les frontmatters BRUTS (pas la sortie Velite) : les dates y sont de
 * vrais jours `AAAA-MM-JJ`. Lève si un répertoire attendu manque : un bilan
 * « zéro » bâti sur un répertoire absent serait une panne déguisée en succès.
 */
export function lireEntrees(root: string): EntreesLues {
  const verifications: EntreeVerification[] = [];
  const fiches: EntreeFiche[] = [];
  const illisibles: ValeurInvalide[] = [];

  const lire = (fichier: string): Record<string, unknown> | null => {
    try {
      return readGuardFrontmatter(fs.readFileSync(path.join(root, fichier), 'utf8')) ?? {};
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      illisibles.push({ fichier, champ: '(frontmatter)', valeur: '', motif: err.message });
      return null;
    }
  };

  for (const fichier of listerMdx(root, DOSSIER_VERIFICATIONS)) {
    const data = lire(fichier);
    if (!data) continue;
    verifications.push({
      fichier,
      cardType: scalaire(data, 'cardType') ?? '?',
      cardSlug: scalaire(data, 'cardSlug') ?? '?',
      locale: scalaire(data, 'locale') ?? '?',
      date: scalaire(data, 'date'),
      nextVerification: scalaire(data, 'nextVerification'),
    });
  }

  for (const { dir, collection } of DOSSIERS_FICHES) {
    for (const fichier of listerMdx(root, dir)) {
      const data = lire(fichier);
      if (!data) continue;
      fiches.push({
        fichier,
        collection,
        slug: scalaire(data, 'slug') ?? '?',
        locale: scalaire(data, 'locale') ?? '?',
        title: scalaire(data, 'title'),
        lastVerified: scalaire(data, 'lastVerified'),
        verificationIntervalDays: scalaire(data, 'verificationIntervalDays'),
      });
    }
  }

  return { verifications, fiches, illisibles };
}

export interface Rapport {
  lignes: string[];
  /** Annotations GitHub : les retards en `warning` (jamais bloquants). */
  avertissements: { titre: string; message: string; fichier: string }[];
  erreurs: { titre: string; message: string; fichier: string }[];
  /** 1 seulement pour une valeur illisible ou future ; un retard ne bloque jamais. */
  code: 0 | 1;
}

/**
 * Met le bilan en mots. Chaque issue imprime ses compteurs : un OK muet serait
 * indiscernable d'un contrôle qui n'a rien lu.
 */
export function formaterRapport(bilan: BilanEcheances, illisibles: ValeurInvalide[] = []): Rapport {
  const lignes: string[] = [];
  const avertissements: Rapport['avertissements'] = [];
  const erreurs: Rapport['erreurs'] = [];
  const invalides = [...illisibles, ...bilan.invalides];

  const nbRetard = bilan.verificationsEnRetard.length + bilan.fichesEnRetard.length;

  lignes.push(`Vérifications en retard au ${bilan.aujourdhui} (avertissement, ne bloque pas) :`);
  lignes.push(
    `  Registre des vérifications : ${bilan.fichesVerifiees} fiche(s) vérifiée(s), ` +
      `${bilan.verificationsAvecEcheance} avec échéance, ${bilan.verificationsEnRetard.length} en retard.`,
  );
  lignes.push(
    `  Dossiers et domaines : ${bilan.fichesAvecDate} fichier(s) avec lastVerified, ` +
      `${bilan.fichesAvecIntervalle} avec intervalle, ${bilan.fichesEnRetard.length} en retard.`,
  );

  for (const v of bilan.verificationsEnRetard) {
    lignes.push(
      `  RETARD ${String(v.joursDeRetard).padStart(4)} j  ${v.cardType}/${v.cardSlug} : ` +
        `prochaine vérification prévue le ${v.echeance} (dernière le ${v.date}, ${v.fichier})`,
    );
    avertissements.push({
      titre: 'Vérification en retard',
      message: `${v.cardType}/${v.cardSlug} : prochaine vérification prévue le ${v.echeance}, en retard de ${v.joursDeRetard} jour(s).`,
      fichier: v.fichier,
    });
  }
  for (const f of bilan.fichesEnRetard) {
    lignes.push(
      `  RETARD ${String(f.joursDeRetard).padStart(4)} j  ${f.fichier} : vérifié le ${f.lastVerified}, ` +
        `intervalle ${f.intervalDays} j, échéance ${f.echeance}`,
    );
    avertissements.push({
      titre: 'Vérification en retard',
      message: `${f.fichier} : vérifié le ${f.lastVerified}, échéance ${f.echeance} dépassée de ${f.joursDeRetard} jour(s).`,
      fichier: f.fichier,
    });
  }

  if (nbRetard === 0) {
    lignes.push('OK : aucune vérification en retard.');
  } else {
    lignes.push(`ATTENTION : ${nbRetard} vérification(s) en retard. Revérifier les faits contre leurs sources,`);
    lignes.push('puis enregistrer la nouvelle vérification (ou poser lastVerified au jour de la relecture).');
    lignes.push('Ne jamais avancer une date sans avoir relu : elle atteste un contrôle, pas une intention.');
  }

  for (const i of invalides) {
    lignes.push(`  FAIL ${i.fichier} : ${i.champ} ${i.valeur ? `« ${i.valeur} » ` : ''}: ${i.motif}`);
    erreurs.push({ titre: 'Date de vérification illisible', message: `${i.fichier} : ${i.champ}, ${i.motif}.`, fichier: i.fichier });
  }
  if (invalides.length > 0) {
    lignes.push(`FAIL : ${invalides.length} valeur(s) de vérification illisible(s) ou future(s), à corriger.`);
  }

  return { lignes, avertissements, erreurs, code: invalides.length > 0 ? 1 : 0 };
}
