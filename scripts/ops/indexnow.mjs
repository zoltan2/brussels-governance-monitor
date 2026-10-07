#!/usr/bin/env node
// scripts/ops/indexnow.mjs --courant <sitemap.xml> [--precedent <sitemap.xml>] [--tout] [--a-blanc]
//
// Annonce à IndexNow (Bing, et par lui la recherche de ChatGPT et de Copilot)
// les pages qui viennent de changer, après un déploiement (indexnow.yml).
//
// Quelles pages : celles dont la date `lastmod` du sitemap a changé, ou qui y
// sont apparues, entre le sitemap gardé du passage précédent et celui que la
// production sert maintenant. Aucune table de correspondance entre fichiers de
// contenu et adresses : le sitemap est déjà la liste des pages publiées, slugs
// localisés compris.
//
// Sans sitemap précédent (premier passage, repère perdu), rien n'est annoncé :
// le passage sert à poser le repère. `--tout` annonce le sitemap entier, pour
// une mise en route ou après une longue interruption.
//
// La clé n'est pas un secret : le protocole exige qu'elle soit lisible à
// https://<hôte>/<clé>.txt (public/<clé>.txt). Elle prouve seulement que
// l'annonce vient du site.
//
// Sortie : une ligne ; code 1 si IndexNow refuse l'annonce. Sans dépendance.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const HOTE = 'governance.brussels';
export const CLE = '0d15b7a02c4484bda2f4948ff73e66a6';
const POINT_D_ENTREE = 'https://api.indexnow.org/indexnow';
// Limite du protocole par demande.
const MAX_URLS = 10000;

const decoder = (texte) =>
  texte
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');

/** Sitemap XML → Map(adresse → lastmod, '' si absent). */
export function lireSitemap(xml) {
  const pages = new Map();
  for (const [, bloc] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = bloc.match(/<loc>([^<]*)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    pages.set(decoder(loc), bloc.match(/<lastmod>([^<]*)<\/lastmod>/)?.[1]?.trim() ?? '');
  }
  return pages;
}

const surLeSite = (url) => url.startsWith(`https://${HOTE}/`);

/** Pages nouvelles ou dont la date a changé. `precedent` nul : rien. */
export function urlsModifiees(precedent, courant) {
  if (!precedent) return [];
  return [...courant]
    .filter(([url, lastmod]) => surLeSite(url) && precedent.get(url) !== lastmod)
    .map(([url]) => url);
}

export function corpsDeLaDemande(urls) {
  return { host: HOTE, key: CLE, keyLocation: `https://${HOTE}/${CLE}.txt`, urlList: urls };
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  const args = process.argv.slice(2);
  const valeur = (nom) => (args.includes(nom) ? args[args.indexOf(nom) + 1] : undefined);
  const fichierCourant = valeur('--courant');
  const fichierPrecedent = valeur('--precedent');
  const tout = args.includes('--tout');
  const aBlanc = args.includes('--a-blanc');
  if (!fichierCourant) {
    console.error('usage : indexnow.mjs --courant <sitemap.xml> [--precedent <sitemap.xml>] [--tout] [--a-blanc]');
    process.exit(2);
  }

  const courant = lireSitemap(readFileSync(fichierCourant, 'utf8'));
  // Un sitemap vide ou tronqué ferait passer la prochaine comparaison pour une
  // vague de pages nouvelles : mieux vaut échouer que poser un mauvais repère.
  if (courant.size < 100) {
    console.log(`FAIL: sitemap courant illisible ou tronqué (${courant.size} page(s))`);
    process.exit(1);
  }

  let precedent = null;
  if (fichierPrecedent) {
    try {
      const lu = lireSitemap(readFileSync(fichierPrecedent, 'utf8'));
      if (lu.size > 0) precedent = lu;
    } catch {
      // Pas de repère : traité comme un premier passage.
    }
  }

  const urls = (tout ? [...courant.keys()].filter(surLeSite) : urlsModifiees(precedent, courant)).slice(0, MAX_URLS);

  if (!tout && !precedent) {
    console.log(`OK: aucun repère précédent, rien d’annoncé (${courant.size} pages au sitemap)`);
    process.exit(0);
  }
  if (urls.length === 0) {
    console.log(`OK: aucune page modifiée (${courant.size} pages au sitemap)`);
    process.exit(0);
  }
  for (const url of urls.slice(0, 50)) console.log(`  ${url}`);
  if (urls.length > 50) console.log(`  … et ${urls.length - 50} autre(s)`);
  if (aBlanc) {
    console.log(`OK: à blanc, ${urls.length} page(s) auraient été annoncées`);
    process.exit(0);
  }

  const reponse = await fetch(POINT_D_ENTREE, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(corpsDeLaDemande(urls)),
    signal: AbortSignal.timeout(30000),
  });
  // 200 : annonce reçue. 202 : reçue, clé encore en cours de vérification.
  if (reponse.status !== 200 && reponse.status !== 202) {
    console.log(`FAIL: IndexNow a répondu ${reponse.status} pour ${urls.length} page(s) : ${(await reponse.text()).slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`OK: ${urls.length} page(s) annoncée(s) à IndexNow (réponse ${reponse.status})`);
}
