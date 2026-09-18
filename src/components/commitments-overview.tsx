// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// PROTOTYPE LOCAL (branche proto/accueil-refonte). Textes FR en dur.
//
// Baromètre complet de la page Engagements, en deux lectures :
//   1. la répartition des 16 engagements par statut (ruban proportionnel + légende) ;
//   2. la même répartition, échéance par échéance, qui n'existait nulle part.
//
// Une répartition, jamais une note : aucun score composite, aucune jauge, aucun
// « avancement global » (brief baromètre de février 2026). Le pourcentage affiché est
// une part du total, pas une progression.
//
// Aucun retard n'est déduit d'une échéance : seul le statut `delayed` dit le retard.
// Une promesse 2026 « en cours législatif » n'est pas en retard tant que l'année court.
//
// Couleurs : contrairement au bandeau bleu de l'accueil, cette page a un fond qui
// s'inverse en mode sombre. La rampe est donc faite d'un seul token adaptatif
// (brand-900) décliné en opacités, plus status-delayed pour le retard.

import { useTranslations } from 'next-intl';
import { countByStatus, type CommitmentLike, type CommitmentStatus } from '@/lib/commitment-status';

const BAR_CLASSES: Record<CommitmentStatus, string> = {
  implemented: 'bg-brand-900',
  'in-legislation': 'bg-brand-900/70',
  announced: 'bg-brand-900/45',
  'not-started': 'bg-brand-900/25',
  delayed: 'bg-status-delayed',
  abandoned: 'bg-neutral-400',
};

// Du plus avancé au moins avancé, puis les statuts hors trajectoire.
const ORDER: CommitmentStatus[] = [
  'implemented',
  'in-legislation',
  'announced',
  'not-started',
  'delayed',
  'abandoned',
];

interface DeadlineCommitment extends CommitmentLike {
  deadline: string;
}

function Ribbon({
  counts,
  labels,
  total,
  ariaLabel,
}: {
  counts: Record<CommitmentStatus, number>;
  labels: Record<CommitmentStatus, string>;
  total: number;
  ariaLabel: string;
}) {
  const segments = ORDER.filter((key) => counts[key] > 0);
  return (
    <div className="flex h-4 gap-[2px] overflow-hidden rounded" role="img" aria-label={ariaLabel}>
      {segments.map((key) => (
        <span
          key={key}
          title={`${labels[key]} : ${counts[key]} sur ${total}`}
          className={BAR_CLASSES[key]}
          style={{ flexGrow: counts[key], flexBasis: 0 }}
        />
      ))}
    </div>
  );
}

export function CommitmentsOverview({ commitments }: { commitments: DeadlineCommitment[] }) {
  const t = useTranslations('dashboard');
  const total = commitments.length;
  const counts = countByStatus(commitments);

  const labels = Object.fromEntries(
    ORDER.map((key) => [key, t(`status.${key}`)]),
  ) as Record<CommitmentStatus, string>;

  const done = counts.implemented;
  const verdict =
    done === 0
      ? `Aucune des ${total} promesses chiffrées n’est mise en œuvre à ce jour`
      : done === 1
        ? `1 promesse chiffrée sur ${total} est mise en œuvre à ce jour`
        : `${done} promesses chiffrées sur ${total} sont mises en œuvre à ce jour`;

  const legend = ORDER.filter((key) => counts[key] > 0 || key === 'implemented');
  const summary = legend.map((key) => `${labels[key]} : ${counts[key]}`).join(', ');

  // Échéances : une ligne par année cible, triée chronologiquement.
  const years = [...new Set(commitments.map((c) => c.deadline))].sort();
  const byYear = years.map((year) => {
    const group = commitments.filter((c) => c.deadline === year);
    const yearCounts = countByStatus(group);
    return {
      year,
      group,
      counts: yearCounts,
      // « Annoncé : 3 » plutôt que « 3 annoncé » : les libellés de statut sont au
      // singulier, et les accorder demanderait une forme par statut et par langue.
      detail: ORDER.filter((key) => yearCounts[key] > 0)
        .map((key) => `${labels[key]} : ${yearCounts[key]}`)
        .join(' · '),
    };
  });

  return (
    <section aria-labelledby="barometre-title" className="mb-8 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
      <h2 id="barometre-title" className="text-lg font-semibold text-neutral-900">
        {verdict}
      </h2>

      <div className="mt-4">
        <Ribbon
          counts={counts}
          labels={labels}
          total={total}
          ariaLabel={`Répartition des ${total} engagements : ${summary}`}
        />
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {legend.map((key) => (
            <li key={key} className="flex items-center gap-2">
              {/* Un statut à zéro n'a pas de segment : sa pastille est vide. */}
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm ${
                  counts[key] > 0 ? BAR_CLASSES[key] : 'border border-neutral-400'
                }`}
              />
              <span className="flex-1 text-neutral-700">{labels[key]}</span>
              <span className="tabular-nums font-semibold text-neutral-900">{counts[key]}</span>
              <span className="w-10 text-right tabular-nums text-neutral-500">
                {Math.round((counts[key] / total) * 100)} %
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
          Échéance par échéance
        </h3>
        <ul className="mt-3 space-y-2.5">
          {byYear.map(({ year, group, counts: yearCounts, detail }) => (
            <li key={year} className="grid grid-cols-[3rem_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[3rem_9rem_1fr]">
              <span className="text-sm font-semibold tabular-nums text-neutral-900">{year}</span>
              <span className="text-xs text-neutral-600">
                {group.length} {group.length > 1 ? 'promesses' : 'promesse'}
              </span>
              <div className="col-span-2 sm:col-span-1">
                <Ribbon
                  counts={yearCounts}
                  labels={labels}
                  total={group.length}
                  ariaLabel={`Échéance ${year} : ${detail}`}
                />
                <p className="mt-1 text-xs text-neutral-600">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
