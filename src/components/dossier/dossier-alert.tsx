// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// La gravité d'une alerte (info / warning / critical) ne peut pas être portée par la
// seule couleur de la carte (WCAG 1.4.1 « Use of Color », obligation EAA). Le libellé
// traduit (alertSeverity.*) est donc affiché en texte visible devant le titre de
// l'alerte, en plus de la couleur et de la bordure existantes. Défaut constaté par la
// revue du 24/09/2026 sur /fr/dossiers/metro-3 (alerte critique sans aucun texte de
// gravité). Utilisé sur les pages dossier et commune : markup identique aux deux.

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface DossierAlertProps {
  /** Texte de l'alerte (déjà localisé côté contenu). */
  label: string;
  /** Gravité, pilote la couleur/bordure ET le libellé texte affiché. */
  severity: AlertSeverity;
  /** Libellé de gravité déjà traduit (ex. t(`alertSeverity.${severity}`)). */
  severityLabel: string;
  /** Date déjà formatée pour la locale courante. */
  formattedDate: string;
}

export function DossierAlert({
  label,
  severity,
  severityLabel,
  formattedDate,
}: DossierAlertProps) {
  return (
    <li
      className={`rounded-lg p-3 text-sm ${
        severity === 'critical'
          ? 'border-2 border-warning-strong bg-warning-bg'
          : severity === 'warning'
            ? 'border border-warning-border bg-warning-bg'
            : 'border border-neutral-200 bg-neutral-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-neutral-700">
          <span className="font-semibold">{severityLabel} :</span> {label}
        </span>
        <span className="shrink-0 text-xs text-neutral-500">{formattedDate}</span>
      </div>
    </li>
  );
}
