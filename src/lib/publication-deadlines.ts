// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { readGitHubFile } from './github';

/**
 * Deux mécanismes indépendants ferment la porte, et les confondre a produit
 * trois specs fausses.
 *
 * 1. L'EMAIL est figé par un GESTE, pas par une heure.
 *    `src/app/api/digest/approve/route.ts` collecte le contenu à
 *    l'approbation (l. 138) et remet le lot à Resend aussitôt (l. 232) ;
 *    `scheduledAt` ne fait que différer la livraison au lundi 8h. Une veille
 *    fusionnée après l'approbation n'est donc dans AUCUN email, même si
 *    l'email ne part que le lendemain. On lit l'état, on ne le déduit pas.
 *
 * 2. LES MDX DU DIGEST sont figés par une heure, en UTC :
 *    `digest.yml` porte `cron: '0 22 * * 0'`. Raisonner en heure de
 *    Bruxelles ferait dériver le seuil d'une heure tout l'hiver.
 *
 * Le magazine, lui, est dérivé du push des MDX et se reconstruit si on les
 * ré-édite : ce n'est pas un seuil, on ne l'annonce pas comme tel.
 */

export type EmailPhase = 'open' | 'committed' | 'unknown';

export interface DigestSnapshot {
  approved: boolean;
  sent: boolean;
  week: string;
  /** Lundi de la semaine couverte, au format `AAAA-MM-JJ`. */
  weekStart: string;
}

export interface ChainState {
  email: EmailPhase;
  emailDetail: string;
  mdxFrozen: boolean;
  mdxDetail: string;
  headline: string;
  urgent: boolean;
}

/**
 * L'instantané couvre-t-il une semaine déjà révolue ?
 *
 * `pending-digest.json` SURVIT à l'envoi : mesuré, il porte encore
 * `{approved: true, sent: true}` plusieurs jours après. Sans cette borne, le
 * bandeau crierait « ne sera pas dans l'email » six jours sur sept, et une
 * alarme permanente n'alerte plus de rien.
 *
 * `prepare-digest` écrit `weekStart` = lundi de la semaine ÉCOULÉE (vérifié :
 * `weekStart: 2026-08-03` pour un `created_at` du dimanche 2026-08-09). La
 * borne tombe donc le lundi à 00:00 UTC — l'un des deux jours où l'essentiel
 * des PR de contenu sont fusionnées, d'où l'importance de nommer ce cas.
 */
export function isSnapshotStale(
  digest: DigestSnapshot | null,
  now: Date,
): boolean {
  if (!digest) return false;
  const start = Date.parse(`${digest.weekStart}T00:00:00Z`);
  if (Number.isNaN(start)) return false;
  return now.getTime() >= start + 7 * 24 * 3_600_000;
}

export function emailPhase(
  digest: DigestSnapshot | null,
  now: Date,
): EmailPhase {
  if (!digest) return 'unknown';

  // Le brouillon couvre une semaine révolue : le prochain digest n'est pas
  // encore préparé, donc cette veille y sera.
  if (isSnapshotStale(digest, now)) return 'open';

  // `approved` suffit : le lot part chez Resend dans la même requête.
  return digest.approved || digest.sent ? 'committed' : 'open';
}

export function isDigestMdxFrozen(now: Date): boolean {
  // Tout en UTC, comme le cron. getUTCDay() : 0 = dimanche, 1 = lundi.
  const day = now.getUTCDay();
  if (day === 1) return true;
  if (day === 0) return now.getUTCHours() >= 22;
  return false;
}

export function chainState(
  digest: DigestSnapshot | null,
  now: Date,
): ChainState {
  const email = emailPhase(digest, now);
  const mdxFrozen = isDigestMdxFrozen(now);

  // Trois cas, pas deux. Sur un instantané périmé et déjà parti, réutiliser le
  // message de `'open'` ferait affirmer « pas encore approuvé » à un écran qui
  // vient de lire `approved: true, sent: true` : la phase est juste, la phrase
  // ment. On nomme donc le cas séparément.
  const staleAndGone =
    email === 'open' && isSnapshotStale(digest, now) && Boolean(digest?.approved || digest?.sent);

  const emailDetail = staleAndGone
    ? 'Le digest de la semaine écoulée est déjà parti. Cette veille rejoindra celui de la semaine prochaine.'
    : email === 'open'
      ? 'Le digest de la semaine n\'est pas encore approuvé : cette veille sera dans l\'email des abonnés.'
      : email === 'committed'
        ? 'Le digest est déjà approuvé et remis à l\'expéditeur. Cette veille ne sera pas dans l\'email de cette semaine, elle rejoindra celui de la semaine prochaine.'
        : 'État du digest illisible. Impossible de dire si cette veille sera dans l\'email : vérifier sur la page de relecture du digest avant de publier.';

  const mdxDetail = mdxFrozen
    ? 'Les pages du digest sont figées pour cette semaine. Publier maintenant reste sans risque pour le site, mais cette veille n\'y apparaîtra pas.'
    : 'Les pages du digest ne sont pas encore générées : cette veille y figurera.';

  const headline =
    email === 'committed'
      ? 'Cette veille arrive après le digest'
      : email === 'unknown'
        ? 'État du digest inconnu'
        : 'Publication sans conséquence';

  return {
    email,
    emailDetail,
    mdxFrozen,
    mdxDetail,
    headline,
    // On alerte aussi quand on ne sait pas : ne jamais supposer « ouvert ».
    urgent: email !== 'open',
  };
}

export async function readDigestSnapshot(): Promise<DigestSnapshot | null> {
  // `readGitHubFile` LÈVE sur tout statut autre que 404 (src/lib/github.ts:44)
  // et porte un `AbortSignal.timeout`. N'entourer que le parsage laisserait
  // un 403 de limite de débit traverser jusqu'à la page, qui rendrait 500 :
  // tout le soin mis à prévoir un repli « inconnu » serait annulé.
  let file;
  try {
    file = await readGitHubFile('data/pending-digest.json');
  } catch {
    return null;
  }
  if (!file) return null;
  try {
    const parsed = JSON.parse(file.content) as Partial<DigestSnapshot>;
    if (typeof parsed.approved !== 'boolean' || typeof parsed.sent !== 'boolean') {
      return null;
    }
    return {
      approved: parsed.approved,
      sent: parsed.sent,
      week: typeof parsed.week === 'string' ? parsed.week : '',
      weekStart: typeof parsed.weekStart === 'string' ? parsed.weekStart : '',
    };
  } catch {
    return null;
  }
}
