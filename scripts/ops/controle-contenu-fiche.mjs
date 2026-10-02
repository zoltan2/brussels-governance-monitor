#!/usr/bin/env node
// scripts/ops/controle-contenu-fiche.mjs <fichier.html> [<étiquette>]
//
// Contrôle de CONTENU minimal d'une fiche témoin servie, pour la sonde
// post-déploiement (smoke-test.yml). Lot 2 de l'abonnement (02/10/2026) : le
// formulaire d'inscription est posé en haut ET en bas de chaque fiche. Environ
// 80 % des visites arrivent sur une fiche : s'il disparaît, plus personne ne
// s'inscrit et aucun code HTTP ne le dit.
//
// Repères lus, communs aux quatre langues et aux quatre types de fiche :
// - data-suivi="inscription-fiche-haut" et data-suivi="inscription-fiche-bas" ;
// - un champ email dans chacun (id="card-subscribe-fiche-haut" / "-bas") ;
// - le formulaire du haut AVANT celui du bas dans le HTML.
//
// Sortie : une ligne ; code 1 si un contrôle échoue. Sans dépendance.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function controlerFiche(html) {
  const problemes = [];
  const positions = {};
  for (const emplacement of ['haut', 'bas']) {
    const repere = html.indexOf(`data-suivi="inscription-fiche-${emplacement}"`);
    positions[emplacement] = repere;
    if (repere === -1) {
      problemes.push(`formulaire d’inscription du ${emplacement} absent (data-suivi="inscription-fiche-${emplacement}")`);
    } else if (!html.includes(` id="card-subscribe-fiche-${emplacement}"`)) {
      problemes.push(`formulaire d’inscription du ${emplacement} sans champ email (id="card-subscribe-fiche-${emplacement}")`);
    }
  }
  if (positions.haut !== -1 && positions.bas !== -1 && positions.haut > positions.bas) {
    problemes.push('formulaire du haut placé après celui du bas');
  }
  return { problemes };
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  const [fichier, etiquette = fichier] = process.argv.slice(2);
  if (!fichier) {
    console.error('usage : controle-contenu-fiche.mjs <fichier.html> [étiquette]');
    process.exit(2);
  }
  const r = controlerFiche(readFileSync(fichier, 'utf8'));
  if (r.problemes.length > 0) {
    for (const p of r.problemes) console.log(`FAIL: ${etiquette} : ${p}`);
    process.exit(1);
  }
  console.log(`OK: ${etiquette} : formulaire d’inscription en haut et en bas`);
}
