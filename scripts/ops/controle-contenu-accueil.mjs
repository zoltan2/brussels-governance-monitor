#!/usr/bin/env node
// scripts/ops/controle-contenu-accueil.mjs <fichier.html> [<étiquette>]
//
// Contrôle de CONTENU minimal de la page d'accueil servie, pour les sondes
// post-déploiement (smoke-test.yml). Les sondes ne lisaient que des codes
// HTTP : du 24 au 28/09/2026, l'accueil a répondu 200 avec un bloc « Ce qu'on
// surveille » figé (revues blue P0 et purple P3). Ici, on exige la présence
// des blocs datés ; la comparaison des dates aux données (radar, changelog)
// est faite toutes les 6 h par la sonde du VPS (bgm-ops, deploy/sonde-accueil).
//
// Repères lus, communs aux quatre langues :
// - barre « Dernière mise à jour » : premier <time dateTime> de la page, avant
//   le bloc « Ce qu'on surveille » ;
// - bloc « Ce qu'on surveille » : du titre id="watch-title" au lien
//   data-umami-event="accueil-radar", avec au moins un <time dateTime> ;
// - compteur de jours rendu par le serveur (nombre dans le HTML).
//
// Sortie : une ligne par contrôle ; code 1 si l'un échoue. Sans dépendance
// (node seul), pour tourner sans `npm ci` dans un workflow.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TIME = /<time\b[^>]*\bdatetime="(\d{4}-\d{2}-\d{2})[^"]*"/gi;

export function controlerAccueil(html) {
  const problemes = [];
  const debut = html.indexOf('id="watch-title"');
  const fin = debut === -1 ? -1 : html.indexOf('data-umami-event="accueil-radar"', debut);

  const barre = [...(debut === -1 ? html : html.slice(0, debut)).matchAll(TIME)][0]?.[1] ?? null;
  if (!barre) problemes.push('barre « Dernière mise à jour » absente ou sans date');

  let signaux = [];
  if (debut === -1 || fin === -1) {
    problemes.push("bloc « Ce qu'on surveille » introuvable (id=\"watch-title\" ou lien accueil-radar absent)");
  } else {
    signaux = [...html.slice(debut, fin).matchAll(TIME)].map((m) => m[1]);
    if (signaux.length === 0) problemes.push("bloc « Ce qu'on surveille » sans aucun signal daté");
  }

  const compteur = html.match(/class="[^"]*\btext-4xl\b[^"]*\btabular-nums\b[^"]*"[^>]*>\s*(\d+)\s*</)?.[1] ?? null;
  if (!compteur) problemes.push('compteur de jours absent du HTML rendu par le serveur');

  return { barre, signaux, compteur, problemes };
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  const [fichier, etiquette = fichier] = process.argv.slice(2);
  if (!fichier) {
    console.error('usage : controle-contenu-accueil.mjs <fichier.html> [étiquette]');
    process.exit(2);
  }
  const r = controlerAccueil(readFileSync(fichier, 'utf8'));
  if (r.problemes.length > 0) {
    for (const p of r.problemes) console.log(`FAIL: ${etiquette} : ${p}`);
    process.exit(1);
  }
  console.log(
    `OK: ${etiquette} : barre au ${r.barre}, ${r.signaux.length} signal(s) du ${r.signaux.join(', ')}, compteur ${r.compteur}`,
  );
}
