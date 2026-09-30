// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Lectures de l'administration du sondage : effectifs bruts, verbatims, exports.
 *
 * Plan d'analyse (spec § 13, écrit avant la collecte) : des EFFECTIFS avec n,
 * jamais de pourcentage. Les effectifs ne comptent que les réponses terminées et
 * hors pilote ; les réponses pilotes et les parcours abandonnés sont comptés à part.
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  OPTIONS,
  Q5_ETATS,
  Q5_NOMS,
  parcours,
  type EtapeChoix,
  type Reponses,
  type ReponseChoix,
} from './questionnaire';
import { toutesLesReponses, tousLesEntretiens, type LigneReponse } from './store';

export interface EffectifsQuestion {
  etape: EtapeChoix;
  /** Répondants dont le parcours comprenait la question. */
  concernes: number;
  /** Parmi eux, ceux qui ont répondu. */
  n: number;
  parOption: Record<string, number>;
}

export interface Synthese {
  terminees: number;
  enCours: number;
  pilotes: number;
  /** Parcours non terminés, par dernière étape enregistrée. */
  abandonsParEtape: Record<string, number>;
  questions: EffectifsQuestion[];
  q5: { nom: string; concernes: number; n: number; parEtat: Record<string, number> }[];
  verbatims: { citables: string[]; nonCitables: string[] };
  autres: { etape: string; texte: string }[];
}

function choixDe(r: Reponses, e: EtapeChoix): ReponseChoix | undefined {
  return r[e as keyof Reponses] as ReponseChoix | undefined;
}

export function retenues(lignes: LigneReponse[]): LigneReponse[] {
  return lignes.filter((l) => l.termine && !l.pilote);
}

export function synthese(db: DatabaseSync): Synthese {
  const toutes = toutesLesReponses(db);
  const lignes = retenues(toutes);
  const abandonsParEtape: Record<string, number> = {};
  for (const l of toutes) {
    if (l.termine || l.pilote) continue;
    abandonsParEtape[l.etape] = (abandonsParEtape[l.etape] ?? 0) + 1;
  }

  const questions: EffectifsQuestion[] = (Object.keys(OPTIONS) as EtapeChoix[]).map((etape) => {
    const parOption: Record<string, number> = Object.fromEntries(OPTIONS[etape].map((o) => [o, 0]));
    let concernes = 0;
    let n = 0;
    for (const l of lignes) {
      if (!parcours(l.reponses).includes(etape)) continue;
      concernes++;
      const v = choixDe(l.reponses, etape)?.valeur;
      if (v && v in parOption) {
        parOption[v]++;
        n++;
      }
    }
    return { etape, concernes, n, parOption };
  });

  const q5 = Q5_NOMS.map((nom) => {
    const parEtat: Record<string, number> = Object.fromEntries(Q5_ETATS.map((e) => [e, 0]));
    let concernes = 0;
    let n = 0;
    for (const l of lignes) {
      if (!parcours(l.reponses).includes('q5')) continue;
      concernes++;
      const v = l.reponses.q5?.lignes?.[nom];
      if (v && v in parEtat) {
        parEtat[v]++;
        n++;
      }
    }
    return { nom, concernes, n, parEtat };
  });

  const citables: string[] = [];
  const nonCitables: string[] = [];
  const autres: { etape: string; texte: string }[] = [];
  for (const l of lignes) {
    const q8 = l.reponses.q8;
    if (q8?.texte) (q8.citation === 'oui' ? citables : nonCitables).push(q8.texte);
    for (const e of ['q1b', 'q7'] as const) {
      const a = l.reponses[e]?.autre;
      if (a) autres.push({ etape: e, texte: a });
    }
  }

  return {
    terminees: lignes.length,
    enCours: toutes.filter((l) => !l.termine && !l.pilote).length,
    pilotes: toutes.filter((l) => l.pilote).length,
    abandonsParEtape,
    questions,
    q5,
    verbatims: { citables, nonCitables },
    autres,
  };
}

/**
 * Une cellule CSV sûre : guillemets doublés, et une formule neutralisée. Un
 * verbatim qui commence par « = », « + », « - » ou « @ » serait exécuté par un
 * tableur à l'ouverture (injection de formule, OWASP).
 */
export function celluleCsv(v: string | number | boolean | null | undefined): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function ligneCsv(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(celluleCsv).join(',');
}

/**
 * Export des réponses, SANS aucune adresse (il n'y en a pas dans la table) et
 * sans identifiant de session : une ligne par réponse terminée, pilotes compris
 * mais marqués. Colonnes stables, une par question.
 */
export function csvReponses(db: DatabaseSync): string {
  const colonnes: string[] = ['langue', 'version', 'pilote', 'cree_le', 'maj_le', 'duree_s'];
  for (const e of Object.keys(OPTIONS) as EtapeChoix[]) {
    colonnes.push(e);
    if (e === 'q1b' || e === 'q7') colonnes.push(`${e}_autre`);
  }
  for (const nom of Q5_NOMS) colonnes.push(`q5_${nom}`);
  colonnes.push('q8_texte', 'q8_citation');

  const lignes = toutesLesReponses(db).filter((l) => l.termine);
  const corps = lignes.map((l) => {
    const r = l.reponses;
    const cells: (string | number | null)[] = [
      l.langue,
      l.version,
      l.pilote ? 1 : 0,
      l.cree_le,
      l.maj_le,
      Math.round(l.duree_ms / 1000),
    ];
    for (const e of Object.keys(OPTIONS) as EtapeChoix[]) {
      cells.push(choixDe(r, e)?.valeur ?? '');
      if (e === 'q1b' || e === 'q7') cells.push(choixDe(r, e)?.autre ?? '');
    }
    for (const nom of Q5_NOMS) cells.push(r.q5?.lignes?.[nom] ?? '');
    cells.push(r.q8?.texte ?? '', r.q8?.texte ? r.q8.citation : '');
    return ligneCsv(cells);
  });
  return [ligneCsv(colonnes), ...corps].join('\r\n') + '\r\n';
}

/** Export des volontaires de Q9 : la seule sortie qui contient une adresse. */
export function csvEntretiens(db: DatabaseSync): string {
  const lignes = tousLesEntretiens(db).map((e) => ligneCsv([e.email, e.langue, e.cree_le, e.statut]));
  return [ligneCsv(['email', 'langue', 'cree_le', 'statut']), ...lignes].join('\r\n') + '\r\n';
}
