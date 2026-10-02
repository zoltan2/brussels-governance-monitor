// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { controlerAccueil } from '../ops/controle-contenu-accueil.mjs';

/**
 * Sondes post-déploiement (smoke-test.yml, regression-test.yml).
 * Revue du 28/09/2026 : elles ne lisaient que des codes HTTP (blue P0,
 * purple P3), et leur branche « curl error (000) » ne pouvait jamais
 * s'exécuter (blue P3).
 */

// Squelette fidèle au HTML servi : mêmes repères, même ordre.
function page({
  barre = '2026-09-28',
  signaux = ['2026-09-28', '2026-09-27'],
  compteur = '226',
  lienRadar = '<a href="/fr/radar" data-suivi="accueil-radar">Tout voir</a>',
  inscription = '<section id="subscribe" class="bg-neutral-50"><form><input type="email" id="subscribe-email"/></form></section>',
} = {}) {
  return [
    '<html><body>',
    '<div class="bg-brand-900"><p class="mt-1 min-h-[2.5rem] text-4xl font-extrabold tabular-nums">',
    compteur,
    '</p></div>',
    barre ? `<p><time dateTime="${barre}" class="tabular-nums">28 septembre 2026</time></p>` : '<p></p>',
    '<h2 id="watch-title" class="text-sm">Ce qu’on surveille</h2>',
    ...signaux.map((d) => `<div><time dateTime="${d}" class="shrink-0">x</time><p>signal</p></div>`),
    lienRadar,
    inscription,
    '</body></html>',
  ].join('');
}

describe('controle-contenu-accueil.mjs', () => {
  it('accepte une page complète', () => {
    const r = controlerAccueil(page());
    expect(r.problemes).toEqual([]);
    expect(r.barre).toBe('2026-09-28');
    expect(r.signaux).toEqual(['2026-09-28', '2026-09-27']);
    expect(r.compteur).toBe('226');
  });

  it('repère la fin du bloc par data-suivi (TrackedLink), et encore par data-umami-event', () => {
    // Fausse alerte du 29/09/2026 : #632 a retiré data-umami-event du lien,
    // la sonde cherchait ce seul repère et déclarait le bloc disparu.
    expect(controlerAccueil(page()).problemes).toEqual([]);
    const ancien = page({ lienRadar: '<a href="/fr/radar" data-umami-event="accueil-radar">Tout voir</a>' });
    expect(controlerAccueil(ancien).problemes).toEqual([]);
    expect(controlerAccueil(page({ lienRadar: '<a href="/fr/radar">Tout voir</a>' })).problemes).toEqual([
      "bloc « Ce qu'on surveille » introuvable (id=\"watch-title\" ou lien accueil-radar absent)",
    ]);
  });

  it('refuse un bloc signaux vide (page en 200, contenu absent)', () => {
    expect(controlerAccueil(page({ signaux: [] })).problemes).toEqual([
      "bloc « Ce qu'on surveille » sans aucun signal daté",
    ]);
  });

  it('refuse une barre sans date, et ne prend pas un signal pour la barre', () => {
    expect(controlerAccueil(page({ barre: '' })).problemes).toEqual([
      'barre « Dernière mise à jour » absente ou sans date',
    ]);
  });

  it("refuse une page d'erreur", () => {
    expect(controlerAccueil('<html><body>502 Bad Gateway</body></html>').problemes).toHaveLength(4);
  });

  // Lot 2 de l'abonnement (02/10/2026) : la carte du digest, le héros et le lien
  // d'évitement mènent à `#subscribe`. Sans l'ancre ou sans le champ, ces liens
  // ne mènent nulle part et plus personne ne peut s'inscrire depuis l'accueil.
  it('refuse une page sans la section d’inscription, ou sans son champ email', () => {
    expect(controlerAccueil(page({ inscription: '' })).problemes).toEqual([
      'formulaire d’inscription absent (section id="subscribe")',
    ]);
    expect(controlerAccueil(page({ inscription: '<section id="subscribe"></section>' })).problemes).toEqual([
      'formulaire d’inscription sans champ email (id="subscribe-email")',
    ]);
    // Un lien vers l'ancre ne vaut pas l'ancre.
    expect(controlerAccueil(page({ inscription: '<a href="#subscribe">Recevoir</a>' })).problemes).toEqual([
      'formulaire d’inscription absent (section id="subscribe")',
    ]);
  });

  it('refuse un compteur absent du HTML serveur', () => {
    expect(controlerAccueil(page({ compteur: '' })).problemes).toEqual([
      'compteur de jours absent du HTML rendu par le serveur',
    ]);
  });
});

/** Exécute scripts/ops/http.sh avec un faux curl qui rejoue une suite de réponses. */
function avecFauxCurl(reponses: Array<{ code: string; sortie: number }>, commande: string) {
  const dir = mkdtempSync(join(tmpdir(), 'http-sh-'));
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(dir, 'n'), '0');
  const cas = reponses.map((r, i) => `${i}) printf '${r.code}'; exit ${r.sortie} ;;`).join('\n');
  writeFileSync(
    join(bin, 'curl'),
    `#!/usr/bin/env bash\nn=$(cat "${dir}/n"); echo $((n+1)) > "${dir}/n"\ncase "$n" in\n${cas}\n*) printf '200' ;;\nesac\n`,
    { mode: 0o755 },
  );
  // `bash -e` : le shell des étapes GitHub, celui qui rendait la branche 000 morte.
  const script = `set -eo pipefail\nsource scripts/ops/http.sh\n${commande}`;
  try {
    const sortie = execFileSync('bash', ['-c', script], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CODE_HTTP_PAUSE: '0' },
      encoding: 'utf8',
    });
    return { code: 0, sortie };
  } catch (e) {
    const err = e as { status: number; stdout: string };
    return { code: err.status, sortie: err.stdout };
  }
}

describe('scripts/ops/http.sh', () => {
  it("témoin : l'ancienne forme de regression-test.yml mourait avant son test « 000 »", () => {
    const t = { code: '000', sortie: 28 };
    const ancienne = [
      'HTTP=$(curl -o /dev/null -s -w "%{http_code}" -L --max-time 30 "https://exemple.test/nl")',
      'if [ "$HTTP" = "000" ]; then echo "FAIL: curl error"; exit 1; fi',
    ].join('\n');
    const r = avecFauxCurl([t], ancienne);
    expect(r.code).toBe(28);
    expect(r.sortie).not.toContain('FAIL: curl error');
  });

  it('un délai dépassé (curl code 28) atteint bien le message « injoignable » au lieu de tuer l’étape', () => {
    const t = { code: '000', sortie: 28 };
    const r = avecFauxCurl([t, t, t], 'exiger_code 200 https://exemple.test/fr');
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('injoignable après 3 tentatives');
  });

  it('un échec isolé pendant la bascule du conteneur ne fait pas échouer la sonde', () => {
    const r = avecFauxCurl([{ code: '502', sortie: 0 }, { code: '000', sortie: 28 }], 'exiger_code 200 https://exemple.test/fr');
    expect(r.code).toBe(0);
    expect(r.sortie).toContain('OK: https://exemple.test/fr → 200');
  });

  it('un 404 attendu passe sans nouvelle tentative, un 404 inattendu échoue', () => {
    expect(avecFauxCurl([{ code: '404', sortie: 0 }], 'exiger_code 404 https://exemple.test/x').code).toBe(0);
    const r = avecFauxCurl([{ code: '404', sortie: 0 }], 'exiger_code 200 https://exemple.test/x');
    expect(r.code).toBe(1);
    expect(r.sortie).toContain('a répondu 404 (attendu 200)');
  });
});
