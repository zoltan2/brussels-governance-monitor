// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Budget d'une fiche dossier — trois formes acceptées dans le frontmatter.
 *
 * 1. `string`   — forme courte, un seul montant : `"~5,2 milliards EUR (projet suspendu)"`
 * 2. `BudgetLine[]` — plusieurs lignes budgétaires, rendues en table financière
 * 3. `BudgetStatus` — rien de publié, l'opacité est l'information
 *
 * La forme string reste valide exprès : c'est la forme naturelle d'un montant
 * unique, et elle évite qu'une fiche écrite sans connaître le format structuré
 * casse le build.
 */

export type BudgetConfidence = 'official' | 'estimated' | 'unconfirmed';

export type BudgetLine = {
  label: string;
  value: string;
  note?: string;
  confidence?: BudgetConfidence;
};

/**
 * Why five statuses and not one catch-all: the editorial wording of a missing
 * budget is itself information. "Non consolidé" (the parts exist, nobody sums
 * them) is not "non chiffré" (nobody has costed it), which is not "non publié"
 * (it exists, it is withheld). Folding them together would rewrite the finding.
 */
export type BudgetStatusKind =
  | 'unpublished'
  | 'not-communicated'
  | 'not-quantified'
  | 'not-consolidated'
  | 'not-applicable';

export type BudgetStatus = {
  status: BudgetStatusKind;
  reason?: string;
};

export type BudgetValue = string | BudgetLine[] | BudgetStatus;

/** Une ligne dont la confiance a été résolue (défaut : `official`). */
export type ResolvedLine = {
  label: string;
  value: string;
  note?: string;
  confidence: BudgetConfidence;
};

export type ParsedBudget =
  | { kind: 'text'; text: string }
  | { kind: 'lines'; lines: ResolvedLine[] }
  | { kind: 'status'; status: BudgetStatusKind; reason?: string };

export type BudgetLabels = {
  unpublished: string;
  notCommunicated: string;
  notQuantified: string;
  notConsolidated: string;
  notApplicable: string;
  more: (count: number) => string;
};

/** Normalise les trois formes de frontmatter en une valeur discriminée. */
export function parseBudget(value: unknown): ParsedBudget | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    const text = value.trim();
    return text ? { kind: 'text', text } : null;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const lines: ResolvedLine[] = value.map((line: BudgetLine) => ({
      label: line.label,
      value: line.value,
      note: line.note,
      confidence: line.confidence ?? 'official',
    }));
    return { kind: 'lines', lines };
  }

  if (typeof value === 'object' && 'status' in value) {
    const { status, reason } = value as BudgetStatus;
    return { kind: 'status', status, reason };
  }

  return null;
}

/** Human label for a missing-budget status, in the caller's locale. */
export function statusLabel(status: BudgetStatusKind, labels: BudgetLabels): string {
  switch (status) {
    case 'unpublished':
      return labels.unpublished;
    case 'not-communicated':
      return labels.notCommunicated;
    case 'not-quantified':
      return labels.notQuantified;
    case 'not-consolidated':
      return labels.notConsolidated;
    case 'not-applicable':
      return labels.notApplicable;
  }
}

/**
 * Résumé une ligne pour les vues liste (`/dossiers`, hub domaine).
 *
 * Dérivé du tableau, jamais rédigé à la main : le résumé ne peut pas
 * diverger du détail affiché sur la fiche.
 */
export function budgetSummary(value: unknown, labels: BudgetLabels): string | null {
  const parsed = parseBudget(value);
  if (!parsed) return null;

  if (parsed.kind === 'text') return parsed.text;
  if (parsed.kind === 'status') return statusLabel(parsed.status, labels);

  const [first, ...rest] = parsed.lines;
  const head = `${first.label} ${first.value}`;
  return rest.length > 0 ? `${head} ${labels.more(rest.length)}` : head;
}

/** Minimal shape of a next-intl translator, enough for the budget keys. */
export type BudgetTranslator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Builds the label set from a `useTranslations('dossiers')` translator.
 * Returns the six keys: the four the summary needs plus the two confidence badges.
 */
export function budgetLabels(
  t: BudgetTranslator,
): BudgetLabels & { estimated: string; unconfirmed: string } {
  return {
    unpublished: t('budgetUnpublished'),
    notCommunicated: t('budgetNotCommunicated'),
    notQuantified: t('budgetNotQuantified'),
    notConsolidated: t('budgetNotConsolidated'),
    notApplicable: t('budgetNotApplicable'),
    more: (count) => t('budgetMore', { count }),
    estimated: t('budgetEstimated'),
    unconfirmed: t('budgetUnconfirmed'),
  };
}
