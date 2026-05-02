// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import type { InstrumentedMetric, ProofSourceType, Tab } from './types';
import { deriveRobustness, robustnessColorClass } from './derive-robustness';
import { safeUrl } from './safe-url';

interface ProofDrawerProps {
  id: string;
  metric: InstrumentedMetric;
  open: boolean;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TAG_LABELS: Record<ProofSourceType, string> = {
  primary: 'Source primaire',
  analysis: 'Analyse',
  relay: 'Relais presse',
  contested: 'Contesté',
};

const TAG_CLASSES: Record<ProofSourceType, string> = {
  primary: 'bg-teal-50 text-teal-700 border-teal-200',
  analysis: 'bg-blue-50 text-blue-700 border-blue-200',
  relay: 'bg-violet-50 text-violet-700 border-violet-200',
  contested: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ALL_TABS: Tab[] = ['narrative', 'data', 'histoire'];
const DISABLED_TABS = new Set<Tab>(['data', 'histoire']);

export function ProofDrawer({ id, metric, open, tab, onTabChange }: ProofDrawerProps) {
  const score = deriveRobustness(metric);

  const tabIds: Record<Tab, string> = {
    narrative: `${id}-tab-narrative`,
    data: `${id}-tab-data`,
    histoire: `${id}-tab-histoire`,
  };
  const panelIds: Record<Tab, string> = {
    narrative: `${id}-panel-narrative`,
    data: `${id}-panel-data`,
    histoire: `${id}-panel-histoire`,
  };

  const enabledTabs = ALL_TABS.filter((t) => !DISABLED_TABS.has(t));

  function handleTablistKeydown(e: React.KeyboardEvent<HTMLDivElement>) {
    const currentIdx = enabledTabs.indexOf(tab);
    let nextIdx = currentIdx;

    switch (e.key) {
      case 'ArrowLeft':
        nextIdx = currentIdx === 0 ? enabledTabs.length - 1 : currentIdx - 1;
        break;
      case 'ArrowRight':
        nextIdx = currentIdx === enabledTabs.length - 1 ? 0 : currentIdx + 1;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = enabledTabs.length - 1;
        break;
      default:
        return;
    }

    // Guard (spec §3.3): si un seul tab est enabled (cas de phase 2e), Left/Right wrappent
    // sur le même index. Ne PAS preventDefault dans ce cas — sinon le scroll horizontal
    // natif du navigateur serait bloqué inutilement quand l'utilisateur a le focus sur le tablist.
    if (nextIdx === currentIdx) return;

    e.preventDefault();
    const nextTab = enabledTabs[nextIdx];
    onTabChange(nextTab);
    // Focus the newly selected tab so screen readers announce
    document.getElementById(tabIds[nextTab])?.focus();
  }

  return (
    /*
      role="region" intentionnel — drawer inline non-modal, pas de focus trap.
      NE JAMAIS upgrader vers role="dialog" sans implémenter focus trap, retour
      focus complet incluant focus trap (lib externe ou implem custom risquée).
      Phase 2e a ajouté : ESC handler + retour focus + tablist conforme + audit
      axe-core. Le passage à dialog reste hors scope tant qu'on n'a pas un cas
      d'usage justifiant un comportement modal.
    */
    <section
      id={id}
      role="region"
      aria-labelledby={`${id}-claim`}
      hidden={!open}
      className="my-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none"
      style={{
        maxHeight: open ? '40rem' : '0',
        opacity: open ? 1 : 0,
      }}
    >
      <div className="space-y-3 p-4 text-sm">
        <RobustnessBar score={score} />

        <p id={`${id}-claim`} className="border-l-2 border-slate-300 pl-3 italic text-slate-700">
          {metric.claim}
        </p>

        <div
          role="tablist"
          aria-label="Vues du fil de preuves"
          onKeyDown={handleTablistKeydown}
          className="flex gap-1 border-b border-slate-200"
        >
          <TabButton
            current={tab}
            value="narrative"
            tabId={tabIds.narrative}
            panelId={panelIds.narrative}
            onClick={onTabChange}
          >
            Narratif
          </TabButton>
          {/* Onglets désactivés en 2a — voir spec phase 2b/2c avant de réactiver */}
          <TabButton
            current={tab}
            value="data"
            tabId={tabIds.data}
            panelId={panelIds.data}
            disabled
            onClick={onTabChange}
          >
            Data brute
          </TabButton>
          <TabButton
            current={tab}
            value="histoire"
            tabId={tabIds.histoire}
            panelId={panelIds.histoire}
            disabled
            onClick={onTabChange}
          >
            Historique
          </TabButton>
        </div>

        {tab === 'narrative' && (
          <div
            role="tabpanel"
            id={panelIds.narrative}
            aria-labelledby={tabIds.narrative}
            tabIndex={0}
          >
            <NarrativeTab metric={metric} />
          </div>
        )}
      </div>
    </section>
  );
}

function RobustnessBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const colorClass = robustnessColorClass(score);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-500">Robustesse</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Score de robustesse"
      >
        <div
          className={`h-full ${pct >= 80 ? 'bg-teal-600' : pct >= 65 ? 'bg-amber-500' : 'bg-rose-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-semibold ${colorClass}`}>{pct}%</span>
    </div>
  );
}

function TabButton({
  current,
  value,
  tabId,
  panelId,
  disabled,
  onClick,
  children,
}: {
  current: Tab;
  value: Tab;
  tabId: string;
  panelId: string;
  disabled?: boolean;
  onClick: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  const active = current === value && !disabled;
  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      onClick={() => onClick(value)}
      className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
        active
          ? 'border-brand-700 text-brand-800'
          : disabled
            ? 'cursor-not-allowed border-transparent text-slate-400'
            : 'border-transparent text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
      {disabled && <span className="ml-1 text-[10px] uppercase">à venir</span>}
    </button>
  );
}

function NarrativeTab({ metric }: { metric: InstrumentedMetric }) {
  return (
    <ol className="space-y-3 pl-0">
      {metric.proofSources.map((src, idx) => {
        const safe = safeUrl(src.url);
        return (
          <li key={`${src.url}-${idx}`} className="flex gap-3">
            <span
              aria-hidden="true"
              className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                src.type === 'primary'
                  ? 'bg-teal-500'
                  : src.type === 'contested'
                    ? 'bg-rose-500'
                    : src.type === 'analysis'
                      ? 'bg-blue-500'
                      : 'bg-violet-500'
              }`}
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900">{src.label}</div>
              {src.description && <div className="mt-0.5 text-xs text-slate-600">{src.description}</div>}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${TAG_CLASSES[src.type]}`}
                >
                  {TAG_LABELS[src.type]}
                </span>
                {safe ? (
                  <a
                    href={safe}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-700 underline underline-offset-2 hover:text-brand-900"
                  >
                    Lire la source
                  </a>
                ) : (
                  <span className="text-xs text-amber-600" title="URL invalide ou scheme non autorisé">
                    URL invalide
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
