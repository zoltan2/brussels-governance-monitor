// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// PROTOTYPE LOCAL (branche proto/accueil-refonte). Textes FR en dur.
//
// Répartition des engagements DPR par statut, en ruban proportionnel. Une répartition,
// pas une note : aucune pondération, aucune jauge (le brief baromètre de février 2026
// excluait les deux). Le verdict en toutes lettres n'est PAS repris ici : le titre de
// la page d'accueil est éditorial (« La Région bruxelloise, revue et corrigée »), et
// c'est le chiffre « Mis en œuvre : 0 » de la légende qui porte le fait.
//
// Couleurs : rampe ordinale d'une seule teinte pour les statuts de progression, validée
// avec le validateur dataviz (--ordinal, mode sombre, surfaces #334155 et #1e293b),
// ambre pour « Retardé ». Le fond du bandeau est figé, ce sont donc des hex, pas des tokens.

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { countByStatus, type CommitmentLike, type CommitmentStatus } from '@/lib/commitment-status';

const COLORS: Record<CommitmentStatus, string> = {
  implemented: '#eaf2ff',
  'in-legislation': '#bcd3f4',
  announced: '#8fb0e0',
  'not-started': '#6184b8',
  delayed: '#fbbf24',
  abandoned: '#94a3b8',
};

// Ordre de lecture : du plus avancé au moins avancé, puis les statuts hors trajectoire.
const ORDER: CommitmentStatus[] = [
  'implemented',
  'in-legislation',
  'announced',
  'not-started',
  'delayed',
  'abandoned',
];

export function CommitmentsBarometer({ commitments }: { commitments: CommitmentLike[] }) {
  const t = useTranslations('dashboard');
  const total = commitments.length;
  const counts = countByStatus(commitments);

  const groups = ORDER.map((key) => ({
    key,
    color: COLORS[key],
    label: t(`status.${key}`),
    count: counts[key],
  }));

  const segments = groups.filter((g) => g.count > 0);
  // « Mis en œuvre » reste dans la légende à zéro : c'est le chiffre que le lecteur cherche.
  const legend = groups.filter((g) => g.count > 0 || g.key === 'implemented');
  const summary = legend.map((g) => `${g.label} : ${g.count}`).join(', ');

  return (
    <Link
      href="/dashboard"
      aria-label={`Baromètre des engagements, ${total} promesses chiffrées. ${summary}. Voir les engagements.`}
      className="group mt-4 block rounded-sm border-t border-white/15 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-slate-800"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Baromètre des engagements</p>

      {/* Ruban proportionnel : une largeur par statut, séparée par 2 px de fond. */}
      <div className="mt-2 flex h-3 gap-[2px]" aria-hidden="true">
        {segments.map((g, i) => (
          <span
            key={g.key}
            title={`${g.label} : ${g.count}`}
            className={`${i === 0 ? 'rounded-l' : ''} ${i === segments.length - 1 ? 'rounded-r' : ''}`}
            style={{ backgroundColor: g.color, flexGrow: g.count, flexBasis: 0 }}
          />
        ))}
      </div>

      <ul className="mt-2 space-y-0.5 text-xs" aria-hidden="true">
        {legend.map((g) => (
          <li key={g.key} className="flex items-center gap-2">
            {/* Un statut à zéro n'a aucun segment dans le ruban : sa pastille est vide,
                pour qu'on ne cherche pas une couleur absente de la barre. */}
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={
                g.count === 0
                  ? { border: `1px solid ${g.color}`, backgroundColor: 'transparent' }
                  : { backgroundColor: g.color }
              }
            />
            <span className="flex-1 text-white/85">{g.label}</span>
            <span className="font-semibold tabular-nums text-white">{g.count}</span>
          </li>
        ))}
      </ul>

      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white underline-offset-2 group-hover:underline">
        Voir les engagements
        <ArrowRight size={14} aria-hidden={true} />
      </span>
    </Link>
  );
}
