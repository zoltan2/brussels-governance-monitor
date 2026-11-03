// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Les coulisses de BGM » : qui reçoit un numéro, et pourquoi les autres non.
 *
 * Fonction pure : elle reçoit les contacts déjà lus (propriétés BRUTES, sans
 * le « fr » par défaut de getContact) et rend la liste des destinataires et le
 * décompte des exclusions par motif, pour le rapport d'envoi.
 *
 * Plan : bgm-ops/plans/2026-11-03-mot-mensuel-lot3-envoi.md. Les précommandes
 * du livre ne sont PAS exclues (décision de Zoltán, 3 novembre 2026).
 */

export type LangueEnvoi = 'fr' | 'nl' | 'en';
export type Variante = 'premier' | 'courant';

export interface ContactBrut {
  id: string;
  email: string;
  unsubscribed: boolean;
  /** `created_at` de Resend (date de confirmation), tel que lu. */
  createdAt: string | undefined;
  /** Propriété `locale` brute : vide si absente. */
  locale: string;
  /** Propriété `mot_mensuel` brute : vide si absente. */
  motMensuel: string;
  /** Propriété `sources` brute. */
  sources: string;
}

export interface Destinataire {
  id: string;
  email: string;
  /** Langue du mail envoyé : un abonné « de » reçoit l'anglais. */
  langue: LangueEnvoi;
  /** Langue enregistrée, pour le rapport. */
  localeAbonne: string;
  variante: Variante;
}

export type MotifExclusion =
  | 'desinscrit'
  | 'refus'
  | 'langue'
  | 'date'
  | 'recent'
  | 'interne'
  | 'deja_envoye';

export interface Selection {
  destinataires: Destinataire[];
  exclus: Record<MotifExclusion, number>;
}

export const ANCIENNETE_MIN_JOURS = 21;
const JOUR = 86_400_000;
const LANGUES: Record<string, LangueEnvoi> = { fr: 'fr', nl: 'nl', en: 'en', de: 'en' };

const normaliser = (s: string) => s.trim().toLowerCase();

/**
 * Liste des adresses internes ou de test, depuis `COULISSES_EXCLUS`
 * (séparées par des virgules, des points-virgules ou des espaces). Absente :
 * `null`, et l'envoi doit être refusé plutôt que de n'exclure personne.
 */
export function lireExclus(valeur: string | undefined): Set<string> | null {
  if (valeur === undefined) return null;
  return new Set(
    valeur
      .split(/[\s,;]+/)
      .map(normaliser)
      .filter(Boolean),
  );
}

/** Adresse de sonde ou du domaine du site : jamais un abonné réel. */
function estInterne(email: string, sources: string, exclus: Set<string>): boolean {
  const e = normaliser(email);
  if (exclus.has(e)) return true;
  if (e.startsWith('healthcheck-')) return true;
  if (/@(mail\.)?(governance\.brussels|brusselsgovernance\.be)$/.test(e)) return true;
  return normaliser(sources).split(',').some((s) => s.trim() === 'healthcheck');
}

export function choisirDestinataires(
  contacts: ContactBrut[],
  options: {
    maintenant: number;
    exclus: Set<string>;
    /** Contacts ayant déjà un envoi réussi d'un numéro antérieur. */
    ontDejaRecu: Set<string>;
    /** Contacts déjà au journal pour CE numéro (réservés ou envoyés). */
    dejaAuJournal: Set<string>;
  },
): Selection {
  const exclus: Record<MotifExclusion, number> = {
    desinscrit: 0,
    refus: 0,
    langue: 0,
    date: 0,
    recent: 0,
    interne: 0,
    deja_envoye: 0,
  };
  const destinataires: Destinataire[] = [];
  const vus = new Set<string>();

  for (const c of contacts) {
    const email = normaliser(c.email);
    if (vus.has(email)) continue;
    vus.add(email);

    if (c.unsubscribed) { exclus.desinscrit++; continue; }
    if (normaliser(c.motMensuel) === 'non') { exclus.refus++; continue; }
    if (estInterne(c.email, c.sources, options.exclus)) { exclus.interne++; continue; }

    const langue = LANGUES[normaliser(c.locale)];
    if (!langue) { exclus.langue++; continue; }

    const cree = c.createdAt ? Date.parse(c.createdAt) : NaN;
    if (!Number.isFinite(cree)) { exclus.date++; continue; }
    if (options.maintenant - cree < ANCIENNETE_MIN_JOURS * JOUR) { exclus.recent++; continue; }

    if (options.dejaAuJournal.has(c.id)) { exclus.deja_envoye++; continue; }

    destinataires.push({
      id: c.id,
      email: c.email.trim(),
      langue,
      localeAbonne: normaliser(c.locale),
      variante: options.ontDejaRecu.has(c.id) ? 'courant' : 'premier',
    });
  }

  return { destinataires, exclus };
}
