// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Verdict de /fr/admin/rapport (spec bgm-ops 2026-11-09, section 14) : une
 * phrase à trous, remplie par règles, jamais un texte libre. Le lecteur, le
 * lundi matin, se demande « pourquoi ? » ; la page doit répondre avant qu'il
 * le demande.
 *
 * Le verdict s'appuie sur le total des clics belges et sur la série par jour,
 * jamais sur les chiffres par page de Search Console filtrés Belgique, qui ne
 * couvrent qu'environ 9 % des clics (constat du 09/11/2026).
 *
 * Fonction pure : aucune date courante, aucun accès disque.
 */
import { pagesCassees, type JourClics, type RapportSeo, type StatutBloc } from './seo-report';

/** En dessous de 10 % d'écart (pourcentage ARRONDI à l'unité), l'audience est
 * dite stable. Le seuil s'applique à la valeur arrondie, celle qu'on affiche :
 * sinon 9,6 % s'afficherait « stable (+10 %) ». */
export const SEUIL_VARIATION_PCT = 10;

/** Un jour dépasse ce multiple de la médiane de sa fenêtre : c'est un pic. */
export const FACTEUR_PIC = 2.5;

const NOMS_VERDICT: Record<keyof RapportSeo['blocs'], string> = {
  gsc: 'Search Console',
  umami: 'Umami',
  crawl: 'passage technique',
};

const STATUTS_VERDICT: Record<Exclude<StatutBloc, 'ok'>, string> = {
  error: 'en panne',
  blocked: 'bloqué',
  absent: 'sans relevé',
  'format-inconnu': 'au format non reconnu',
};

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

function nombre(n: number): string {
  return n.toLocaleString('fr-BE');
}

/** « 0 clic », « 1 clic », « 2 clics » : le singulier français va jusqu'à 1. */
function clics(n: number): string {
  return `${nombre(n)} ${n > 1 ? 'clics' : 'clic'}`;
}

/** Arrondi à l'unité symétrique : Math.round(−9,5) vaut −9 en JavaScript,
 * alors que Math.round(9,5) vaut 10. Une baisse et une hausse de même
 * ampleur doivent tomber du même côté du seuil. */
function arrondiSymetrique(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x));
}

/** Écart en pourcentage, arrondi à l'unité ; null si la base vaut 0. */
export function ecartPourcent(actuel: number, precedent: number): number | null {
  if (precedent <= 0) return null;
  return arrondiSymetrique(((actuel - precedent) / precedent) * 100);
}

/** « −15 », « +3 », « 0 » : le signe moins typographique, jamais un trait
 * d'union. */
function signe(pct: number): string {
  if (pct > 0) return `+${pct}`;
  if (pct < 0) return `−${Math.abs(pct)}`;
  return '0';
}

export function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const tri = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tri.length / 2);
  return tri.length % 2 === 1 ? tri[milieu] : (tri[milieu - 1] + tri[milieu]) / 2;
}

/** Le jour le plus haut d'une fenêtre, s'il dépasse FACTEUR_PIC fois la
 * médiane de cette même fenêtre. Un jour à `null` n'est ni un pic ni un zéro :
 * il est écarté du calcul. */
export function picDeFenetre(
  jours: JourClics[] | null,
): { date: string; clics: number; mediane: number } | null {
  if (!jours) return null;
  const connus = jours.filter((j): j is JourClics & { clics: number } => j.clics !== null);
  const med = mediane(connus.map((j) => j.clics));
  if (med === null) return null;
  let haut = connus[0];
  for (const j of connus) if (j.clics > haut.clics) haut = j;
  if (!(haut.clics > FACTEUR_PIC * med)) return null;
  return { date: haut.date, clics: haut.clics, mediane: med };
}

function jourLisible(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return date;
  return `${Number(m[3])} ${MOIS[Number(m[2]) - 1]}`;
}

/**
 * Le verdict, phrase par phrase, dans l'ordre de la section 14 :
 * 1. un bloc pas « ok » : « Relevé incomplet : … » en tête ;
 * 2. l'écart des clics belges (total) aux 28 jours précédents ;
 * 3. le pic qui explique l'écart, si la série par jour en montre un ;
 * 4. les pages qui ne répondent pas 200.
 */
export function verdictRapport(rapport: Pick<RapportSeo, 'blocs'>): string[] {
  const { gsc, crawl } = rapport.blocs;
  const phrases: string[] = [];

  const enDefaut = (Object.keys(NOMS_VERDICT) as (keyof RapportSeo['blocs'])[])
    .map((cle) => ({ cle, statut: rapport.blocs[cle].status }))
    .filter(
      (b): b is { cle: keyof RapportSeo['blocs']; statut: Exclude<StatutBloc, 'ok'> } =>
        b.statut !== 'ok',
    );
  if (enDefaut.length > 0) {
    phrases.push(
      `Relevé incomplet : ${enDefaut.map((b) => `${NOMS_VERDICT[b.cle]} ${STATUTS_VERDICT[b.statut]}`).join(', ')}.`,
    );
  }

  // Search Console pas « ok » : la phrase 1 le dit déjà, aucun chiffre
  // d'audience ne s'en déduit.
  const donnees = gsc.status === 'ok' ? gsc.donnees : null;
  if (gsc.status === 'ok') {
    const actuel = donnees?.clicsBelgique ?? null;
    const precedent = donnees?.clicsBelgiquePrecedents ?? null;
    if (actuel === null) {
      phrases.push('Clics depuis la Belgique non transmis dans ce relevé : pas de verdict.');
    } else if (precedent === null) {
      phrases.push(
        `${clics(actuel)} depuis la Belgique sur 28 jours ; période précédente indisponible.`,
      );
    } else if (precedent === 0) {
      phrases.push(
        actuel === 0
          ? 'Aucun clic depuis la Belgique sur 28 jours, ni sur les 28 jours précédents.'
          : `${clics(actuel)} depuis la Belgique sur 28 jours, contre aucun sur les 28 jours précédents.`,
      );
    } else {
      const pct = ecartPourcent(actuel, precedent)!;
      if (Math.abs(pct) < SEUIL_VARIATION_PCT) {
        phrases.push(
          `Audience stable : ${clics(actuel)} depuis la Belgique sur 28 jours (${signe(pct)} %).`,
        );
      } else {
        const sens = pct < 0 ? 'baisse' : 'hausse';
        phrases.push(
          `Clics depuis la Belgique en ${sens} de ${Math.abs(pct)} % (${nombre(actuel)} contre ${nombre(precedent)}).`,
        );
        // En baisse, le pic se cherche dans la fenêtre précédente (il gonfle
        // la base) ; en hausse, dans la fenêtre courante.
        const pic = picDeFenetre(
          pct < 0
            ? (donnees?.clicsBelgiqueParJourPrecedent ?? null)
            : (donnees?.clicsBelgiqueParJour ?? null),
        );
        if (pic) {
          const actuelSansPic = pct < 0 ? actuel : actuel - pic.clics + pic.mediane;
          const precedentSansPic = pct < 0 ? precedent - pic.clics + pic.mediane : precedent;
          const q = ecartPourcent(actuelSansPic, precedentSansPic);
          if (q !== null) {
            phrases.push(
              `Sans le pic du ${jourLisible(pic.date)} (${clics(pic.clics)}), l'écart serait de ${signe(q)} %.`,
            );
          }
        }
      }
    }
  }

  if (crawl.status === 'ok' && crawl.donnees?.pages) {
    const n = pagesCassees(crawl.donnees.pages).length;
    if (n > 0) phrases.push(n === 1 ? '1 page en erreur.' : `${nombre(n)} pages en erreur.`);
  }

  return phrases;
}
