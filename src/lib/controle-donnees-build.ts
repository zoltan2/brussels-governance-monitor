// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Contrôles après build sur les DONNÉES que le serveur chargera en mémoire.
 * Module pur : `scripts/controle-apres-build.ts` lui passe ce qu'il a lu sur disque.
 *
 * Deux pannes, toutes deux muettes pour `next build` :
 *
 * 1. Les sorties de Velite se lisent sur disque à l'exécution
 *    (`src/lib/collections-velite.ts`). La sortie autonome (`output: 'standalone'`)
 *    ne contient que les fichiers tracés : si `.velite/` n'y est pas recopié en
 *    entier, l'image démarre, sert ses pages pré-rendues, puis lève une erreur à
 *    chaque régénération.
 * 2. Un jeu de données importé comme module est recopié dans le code serveur.
 *    Le 01/10/2026, deux modules de 20 Mo remplissaient le tas de Node (41 arrêts
 *    « heap out of memory » en 11 h 30). `donnees-hors-bundle.test.ts` interdit
 *    l'import de `.velite/` ; ce plafond attrape le même défaut par un autre chemin.
 */

export interface FichierMesure {
  nom: string;
  octets: number;
}

export interface ModuleMesure {
  chemin: string;
  octets: number;
}

/**
 * Taille au-delà de laquelle un module serveur est refusé. Le plus lourd mesuré
 * après correctif pèse moins de 2 Mo ; un jeu de données embarqué en pesait 20.
 */
export const PLAFOND_MODULE_SERVEUR = 5 * 1024 * 1024;

/** Ce qui manque à la copie de `.velite/` dans la sortie autonome. Vide = tout y est. */
export function donneesAutonomesManquantes(source: FichierMesure[], copie: FichierMesure[]): string[] {
  if (source.length === 0) return ['.velite/ ne contient aucune collection'];
  const tailles = new Map(copie.map((f) => [f.nom, f.octets]));
  const manques: string[] = [];
  for (const { nom, octets } of source) {
    const copiee = tailles.get(nom);
    if (copiee === undefined) manques.push(`${nom} : absent de la sortie autonome`);
    else if (copiee !== octets) manques.push(`${nom} : ${copiee} octets dans la sortie autonome, ${octets} dans .velite/`);
  }
  return manques;
}

/** Modules serveur au-dessus du plafond, le plus lourd en tête. Vide = aucun. */
export function modulesServeurTropLourds(modules: ModuleMesure[], plafond = PLAFOND_MODULE_SERVEUR): string[] {
  return modules
    .filter((m) => m.octets > plafond)
    .sort((a, b) => b.octets - a.octets)
    .map((m) => `${m.chemin} : ${(m.octets / (1024 * 1024)).toFixed(1)} Mo`);
}
