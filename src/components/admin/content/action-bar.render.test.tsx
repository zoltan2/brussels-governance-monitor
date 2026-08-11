// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionBar } from './action-bar';
import type { CheckState } from '@/lib/github-pr';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const green: CheckState = { passed: 3, pending: 0, failed: [], total: 3, missing: [] };
const running: CheckState = { passed: 2, pending: 1, failed: [], total: 3, missing: ['Content lint'] };
const broken: CheckState = { passed: 2, pending: 0, failed: ['Content lint'], total: 3, missing: ['Content lint'] };

describe('ActionBar', () => {
  it('active la publication quand tout est vert', () => {
    render(<ActionBar number={1} sha="abc1234" checks={green} truncated={false} locale="fr" />);
    expect(screen.getByRole('button', { name: /publier/i }).hasAttribute('disabled')).toBe(false);
  });

  it('désactive et explique tant que les contrôles tournent', () => {
    render(<ActionBar number={1} sha="abc1234" checks={running} truncated={false} locale="fr" />);
    expect(screen.getByRole('button', { name: /contrôles/i }).hasAttribute('disabled')).toBe(true);
  });

  it('désactive quand un contrôle échoue', () => {
    render(<ActionBar number={1} sha="abc1234" checks={broken} truncated={false} locale="fr" />);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('désactive quand la liste de fichiers est tronquée, même tout vert', () => {
    render(<ActionBar number={1} sha="abc1234" checks={green} truncated={true} locale="fr" />);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });
});
