#!/usr/bin/env node
// scripts/ops/velite-sans-erreur.mjs [options de velite build]
//
// Lance `velite build` et ÉCHOUE si Velite signale une erreur de schéma.
//
// Velite écarte une fiche invalide, journalise « error … » et sort 0. Le
// 29/09/2026, `changeType: corrected` (refusé sur les fiches domaine) a ainsi
// retiré la page mobility du site dans les quatre langues, avec une CI verte
// (#647). Son option `--strict` ne convient pas : elle échoue aussi sur les
// simples notes « info » (titres trop longs du magazine, contenu vide), que le
// dépôt tolère. Ici, seules les lignes « error » comptent.

import { spawn } from 'node:child_process';

export function compterErreurs(sortie) {
  // Velite colore parfois la sortie : on retire les séquences ANSI avant de lire.
  const propre = sortie.replace(/\x1b\[[0-9;]*m/g, '');
  return propre.split('\n').filter((l) => /^\s*error\s/.test(l)).length;
}

const direct = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (direct) {
  const enfant = spawn('npx', ['velite', 'build', ...process.argv.slice(2)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let sortie = '';
  for (const flux of [enfant.stdout, enfant.stderr]) {
    flux.on('data', (d) => {
      sortie += d;
      process.stdout.write(d);
    });
  }
  enfant.on('close', (code) => {
    const n = compterErreurs(sortie);
    if (code !== 0) process.exit(code ?? 1);
    if (n > 0) {
      console.error(`\nvelite-sans-erreur : ${n} erreur(s) de schéma, une ou plusieurs fiches ont été écartées du site. Build refusé.`);
      process.exit(1);
    }
  });
}
