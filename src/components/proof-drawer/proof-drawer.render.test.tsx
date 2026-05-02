// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// @vitest-environment jsdom

import { render, cleanup, fireEvent } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { ProofDrawer } from './proof-drawer';
import type { InstrumentedMetric } from './types';

// vitest-axe ships its type augmentation under `namespace Vi` (legacy).
// Vitest 3.x uses module 'vitest' Assertion. We re-declare here so TS
// recognises toHaveNoViolations on the expect chain.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

expect.extend(matchers);

const fixture: InstrumentedMetric = {
  label: 'Compensation fédérale (chiffrage Cour des comptes)',
  value: '300',
  unit: 'M€',
  date: '2025-11-17',
  id: 'cpas-234-vs-300',
  claim:
    "La compensation fédérale pour la réforme du chômage est chiffrée à 300 M€ contre 234 M€ : écart de 22 % non réconcilié.",
  proofStatus: 'contested',
  robustness: 65,
  bgmAlert: false,
  proofSources: [
    {
      label: 'UVCW — Réforme du chômage : compensations octroyées aux CPAS',
      url: 'https://www.uvcw.be/insertion/actus/art-9826',
      type: 'primary',
      description: 'Synthèse fédérale Cour des comptes / Brulocalis.',
    },
    {
      label: 'SPP IS — Décision du gouvernement fédéral',
      url: 'https://www.mi-is.be/fr/nouvelles/decision',
      type: 'contested',
      description: 'Position gouvernementale concurrente, 234 M€.',
    },
  ],
  revisions: [
    {
      date: '2026-05-02',
      badge: 'initial',
      title: 'Ajout initial du claim de tension',
      description: 'Documentation simultanée des deux chiffrages.',
    },
  ],
};

describe('ProofDrawer a11y (axe-core via jsdom)', () => {
  afterEach(cleanup);

  it('has no axe violations when closed', async () => {
    const { container } = render(
      <ProofDrawer
        id="test-drawer"
        metric={fixture}
        open={false}
        tab="narrative"
        onTabChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations when open on narrative tab', async () => {
    const { container } = render(
      <ProofDrawer
        id="test-drawer-open"
        metric={fixture}
        open={true}
        tab="narrative"
        onTabChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders WAI-ARIA tablist pattern with tabpanel and aria-controls', () => {
    const { container } = render(
      <ProofDrawer
        id="test-tablist"
        metric={fixture}
        open={true}
        tab="narrative"
        onTabChange={() => {}}
      />,
    );

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(3); // narrative + data (disabled) + histoire (disabled)

    const panel = container.querySelector('[role="tabpanel"]');
    expect(panel).not.toBeNull();

    // Each tab must aria-controls a panel
    tabs.forEach((tab) => {
      expect(tab.getAttribute('aria-controls')).toBeTruthy();
    });

    // The tabpanel must be aria-labelledby a tab id
    const labelledBy = panel?.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const labellingTab = container.querySelector(`#${labelledBy}`);
    expect(labellingTab?.getAttribute('role')).toBe('tab');
  });

  it('roving tabindex: only the active tab has tabIndex 0', () => {
    const { container } = render(
      <ProofDrawer
        id="test-roving"
        metric={fixture}
        open={true}
        tab="narrative"
        onTabChange={() => {}}
      />,
    );
    const tabs = container.querySelectorAll('[role="tab"]');
    const tabIndices = Array.from(tabs).map((t) => t.getAttribute('tabindex'));
    // narrative is active → 0; data and histoire disabled → -1
    expect(tabIndices).toEqual(['0', '-1', '-1']);
  });

  it('does NOT render role="dialog" (locked to region by spec)', () => {
    const { container } = render(
      <ProofDrawer
        id="test-region"
        metric={fixture}
        open={true}
        tab="narrative"
        onTabChange={() => {}}
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[role="region"]')).not.toBeNull();
  });
});

describe('ProofDrawer phase 2b — data tab', () => {
  afterEach(cleanup);

  it('has no axe violations when open on data tab', async () => {
    const { container } = render(
      <ProofDrawer
        id="test-data-axe"
        metric={fixture}
        open={true}
        tab="data"
        onTabChange={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders the metric JSON in the data tab', () => {
    const { container } = render(
      <ProofDrawer
        id="test-data-content"
        metric={fixture}
        open={true}
        tab="data"
        onTabChange={() => {}}
      />,
    );
    const code = container.querySelector('pre code');
    expect(code).not.toBeNull();
    expect(code?.textContent).toContain('"cpas-234-vs-300"');
    expect(code?.textContent).toContain('"robustness": 65');
    expect(code?.textContent).toContain('"proofStatus"');
    expect(code?.textContent).toContain('"contested"');
  });

  it('applies token classes (key, string, number, bool, punct)', () => {
    const { container } = render(
      <ProofDrawer
        id="test-data-tokens"
        metric={fixture}
        open={true}
        tab="data"
        onTabChange={() => {}}
      />,
    );
    expect(container.querySelector('span.text-blue-700')).not.toBeNull(); // key
    expect(container.querySelector('span.text-emerald-700')).not.toBeNull(); // string
    expect(container.querySelector('span.text-amber-700')).not.toBeNull(); // number
    expect(container.querySelector('span.text-violet-700')).not.toBeNull(); // bool (false)
    expect(container.querySelector('span.text-slate-500')).not.toBeNull(); // punct
  });

  it('does NOT render <a> in the data tab (URLs are plain text)', () => {
    const { container } = render(
      <ProofDrawer
        id="test-data-no-link"
        metric={fixture}
        open={true}
        tab="data"
        onTabChange={() => {}}
      />,
    );
    const dataPanel = container.querySelector('[id$="-panel-data"]');
    expect(dataPanel).not.toBeNull();
    expect(dataPanel?.querySelectorAll('a').length).toBe(0);
  });

  it('does NOT leak Velite internal fields (_raw, _meta, _id) in JSON output', () => {
    // Garde-fou post-review §4.1 : si Velite introduit des champs internes au
    // niveau métrique dans une future version, ce test catch immédiatement.
    const { container } = render(
      <ProofDrawer
        id="test-data-no-leak"
        metric={fixture}
        open={true}
        tab="data"
        onTabChange={() => {}}
      />,
    );
    const code = container.querySelector('pre code');
    expect(code?.textContent).not.toContain('_raw');
    expect(code?.textContent).not.toContain('_meta');
    expect(code?.textContent).not.toContain('"_id"');
  });

  it('arrow Right cycles narrative → data (now both enabled)', () => {
    const onTabChange = vi.fn();
    const { container } = render(
      <ProofDrawer
        id="test-arrow-right"
        metric={fixture}
        open={true}
        tab="narrative"
        onTabChange={onTabChange}
      />,
    );
    const tablist = container.querySelector('[role="tablist"]');
    fireEvent.keyDown(tablist!, { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('data');
  });

  it('arrow Left from narrative wraps to data (skipping disabled histoire)', () => {
    // Post-review §8.1 : couvrir l'autre direction. enabledTabs = ['narrative', 'data']
    // (histoire reste disabled en 2b). ArrowLeft depuis narrative wrappe en arrière
    // sur le dernier enabled = data. Le tab disabled "histoire" est silencieusement
    // skippé puisqu'il n'est pas dans enabledTabs.
    const onTabChange = vi.fn();
    const { container } = render(
      <ProofDrawer
        id="test-arrow-left"
        metric={fixture}
        open={true}
        tab="narrative"
        onTabChange={onTabChange}
      />,
    );
    const tablist = container.querySelector('[role="tablist"]');
    fireEvent.keyDown(tablist!, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith('data');
  });
});
