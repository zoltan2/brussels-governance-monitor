// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useTranslations } from 'next-intl';

import { formatDate } from '@/lib/utils';
import { jourISO } from '@/lib/velite-date';
import { estJourISO } from '@/lib/verification-due';
import { ExplainTip } from './explain-tip';

interface VerifiedBadgeProps {
  /** `lastVerified` de la fiche. Absent : rien n'est rendu. */
  lastVerified: string | undefined;
  locale: string;
}

/**
 * « Vérifié le … » : date à laquelle une personne a relu les faits de la fiche
 * contre leurs sources, que le texte ait changé ou non. Distincte de la date
 * de mise à jour portée par FreshnessBadge, à côté de laquelle elle s'affiche.
 *
 * Sans date, ou avec une date illisible, le composant ne rend RIEN : on
 * n'affiche jamais une vérification qu'on ne peut pas prouver. (Velite ne
 * bloque pas sur une erreur de schéma ; le lint verification-overdue, lui, échoue.)
 *
 * Aucune couleur d'état : le sens est porté par le texte seul.
 */
export function VerifiedBadge({ lastVerified, locale }: VerifiedBadgeProps) {
  const t = useTranslations('freshness');
  const jour = jourISO(lastVerified);
  if (!estJourISO(jour)) return null;

  // Midi UTC : le jour ne glisse pas d'un fuseau à l'autre au formatage.
  const date = formatDate(`${jour}T12:00:00Z`, locale);

  return (
    // <div>, pas <span> : ExplainTip rend un <details>, contenu de flux.
    <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700">
      <span>
        {t.rich('verifiedOn', {
          date,
          time: (chunks) => <time dateTime={jour}>{chunks}</time>,
        })}
      </span>
      <ExplainTip label={t('verifiedExplainLabel')} text={t('verifiedExplain')} />
    </div>
  );
}
