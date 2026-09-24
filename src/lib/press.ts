// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Revue de presse de la page « Presse & données » : une seule source de données,
 * `data/press-mentions.json`, validée ici.
 *
 * Trois familles, qui ne disent pas la même chose d'un média :
 *   - `about_bgm` : un article CONSACRÉ au projet ;
 *   - `source_citation` : un contenu qui s'appuie sur une page de BGM comme source ;
 *   - `institutional_relay` : une institution ou une encyclopédie qui renvoie vers BGM.
 *
 * Règles de saisie, chacune née d'un cas réel :
 *   - `title` est le titre TEL QU'AFFICHÉ par la source, dans sa langue (`lang`).
 *     L'ancien fichier traduisait les titres en quatre langues : un lecteur
 *     néerlandophone voyait sous le nom de la RTBF un titre que la RTBF n'a jamais
 *     publié.
 *   - `publishedAt` est la date affichée sur la page de l'article, lue à l'heure de
 *     Bruxelles. Un horodatage machine en UTC peut tomber la veille (article mis en
 *     ligne à 23 h 00 UTC, soit minuit à Bruxelles) : la date retenue est celle que
 *     le lecteur voit. `null` quand la source n'affiche aucune date de publication
 *     (encyclopédie) ; si elle n'affiche qu'une date de mise à jour, celle-ci va
 *     dans `updatedAt` et s'affiche comme telle, jamais comme une publication.
 *   - `verifiedAt` est le jour où l'entrée a été contrôlée sur la source (existence,
 *     titre, média, auteur, date). Elle est distincte de `publishedAt`.
 *   - Une même couverture publiée en deux langues est UNE entrée : la seconde langue
 *     va dans `translatedVersions`, sans quoi elle serait comptée deux fois.
 *   - `author` n'est renseigné que si la source l'affiche.
 */

import { z } from 'zod';
import type { Locale } from '@/i18n/routing';
import pressMentionsData from '../../data/press-mentions.json';

export const PRESS_KINDS = ['about_bgm', 'source_citation', 'institutional_relay'] as const;
export type PressKind = (typeof PRESS_KINDS)[number];

/** Un jour civil réel au format AAAA-MM-JJ (le 2026-02-30 est refusé). */
const jourIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'date inexistante');

const codeLangue = z.string().regex(/^[a-z]{2}$/);
const urlHttps = z.url().refine((u) => u.startsWith('https://'), 'URL non HTTPS');

const texteLocalise = z.object({
  fr: z.string().min(1),
  nl: z.string().min(1),
  en: z.string().min(1),
  de: z.string().min(1),
});

const versionTraduite = z
  .object({
    lang: codeLangue,
    url: urlHttps,
    title: z.string().min(1),
  })
  .strict();

export const pressMentionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    kind: z.enum(PRESS_KINDS),
    outlet: z.string().min(1),
    author: z.string().min(1).nullable(),
    title: z.string().min(1),
    lang: codeLangue,
    url: urlHttps,
    publishedAt: jourIso.nullable(),
    /** Date de mise à jour affichée, quand la source ne montre QUE celle-là. */
    updatedAt: jourIso.optional(),
    verifiedAt: jourIso,
    /** Ce que la page fait de BGM, quand le titre ne le dit pas (citation, relais). */
    context: texteLocalise.optional(),
    translatedVersions: z.array(versionTraduite).default([]),
  })
  .strict();

export const pressMentionsSchema = z.array(pressMentionSchema);

export type PressMentionRaw = z.infer<typeof pressMentionSchema>;

export interface PressMention {
  id: string;
  kind: PressKind;
  outlet: string;
  author: string | null;
  title: string;
  lang: string;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  verifiedAt: string;
  context: string | null;
  translatedVersions: Array<{ lang: string; url: string; title: string }>;
}

/** Valide un tableau brut et le rend dans la langue demandée, le plus récent d'abord. */
export function localizePressMentions(raw: unknown, locale: Locale): PressMention[] {
  return pressMentionsSchema
    .parse(raw)
    .map((m) => ({
      id: m.id,
      kind: m.kind,
      outlet: m.outlet,
      author: m.author,
      title: m.title,
      lang: m.lang,
      url: m.url,
      publishedAt: m.publishedAt,
      updatedAt: m.updatedAt ?? null,
      verifiedAt: m.verifiedAt,
      context: m.context ? m.context[locale] : null,
      translatedVersions: m.translatedVersions,
    }))
    .sort((a, b) =>
      (b.publishedAt ?? b.updatedAt ?? '').localeCompare(a.publishedAt ?? a.updatedAt ?? ''),
    );
}

export function getPressMentions(locale: Locale): PressMention[] {
  return localizePressMentions(pressMentionsData, locale);
}

/** Regroupe par famille, dans l'ordre de PRESS_KINDS ; une famille vide reste présente. */
export function groupPressMentions(mentions: PressMention[]): Record<PressKind, PressMention[]> {
  const groupes = Object.fromEntries(PRESS_KINDS.map((k) => [k, [] as PressMention[]])) as Record<
    PressKind,
    PressMention[]
  >;
  for (const m of mentions) groupes[m.kind].push(m);
  return groupes;
}

/** Dernier jour de vérification de la liste, pour l'afficher une fois sous la revue. */
export function latestVerification(mentions: PressMention[]): string | null {
  return mentions.reduce<string | null>((max, m) => (!max || m.verifiedAt > max ? m.verifiedAt : max), null);
}
