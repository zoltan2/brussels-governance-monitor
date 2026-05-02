// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// @vitest-environment jsdom

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import { SignalLead } from './signal-lead';
import { DensityProvider } from './density-context';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

expect.extend(matchers);

describe('SignalLead', () => {
  afterEach(cleanup);

  it('renders nothing when no DensityProvider is in scope (structured page)', () => {
    const { container } = render(<SignalLead>1-liner pour signal mode</SignalLead>);
    expect(container.firstChild).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('renders <div class="d-signal"> when DensityProvider is in scope (scrolly page)', () => {
    const { container } = render(
      <DensityProvider>
        <SignalLead>1-liner pour signal mode</SignalLead>
      </DensityProvider>,
    );
    const div = container.querySelector('.d-signal');
    expect(div).not.toBeNull();
    expect(div?.tagName).toBe('DIV');
    expect(div?.textContent).toBe('1-liner pour signal mode');
  });

  it('has no axe violations when rendered with provider', async () => {
    const { container } = render(
      <DensityProvider>
        <SignalLead>Phrase signal accessible</SignalLead>
      </DensityProvider>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
