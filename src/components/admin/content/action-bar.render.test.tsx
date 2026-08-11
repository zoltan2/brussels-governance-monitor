// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionBar } from './action-bar';
import type { CheckState } from '@/lib/github-pr';

// `refresh` est partagé pour pouvoir l'observer depuis les tests.
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const green: CheckState = { passed: 3, pending: 0, failed: [], total: 3, missing: [] };
const running: CheckState = { passed: 2, pending: 1, failed: [], total: 3, missing: ['Content lint'] };
const broken: CheckState = { passed: 2, pending: 0, failed: ['Content lint'], total: 3, missing: ['Content lint'] };

describe('ActionBar', () => {
  it('active la publication quand tout est vert', () => {
    render(<ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />);
    expect(screen.getByRole('button', { name: /publier/i }).hasAttribute('disabled')).toBe(false);
  });

  it('désactive et explique tant que les contrôles tournent', () => {
    render(<ActionBar number={1} sha="abc1234" checks={running} truncated={false} fileRefusal={null} locale="fr" />);
    expect(screen.getByRole('button', { name: /contrôles/i }).hasAttribute('disabled')).toBe(true);
  });

  it('désactive quand un contrôle échoue', () => {
    render(<ActionBar number={1} sha="abc1234" checks={broken} truncated={false} fileRefusal={null} locale="fr" />);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('désactive quand la liste de fichiers est tronquée, même tout vert', () => {
    render(<ActionBar number={1} sha="abc1234" checks={green} truncated={true} fileRefusal={null} locale="fr" />);
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('désactive quand un fichier est hors périmètre, même tout vert', () => {
    // La route répond 403 sur ce cas : le bouton ne doit pas inviter au clic.
    render(
      <ActionBar
        number={1}
        sha="abc1234"
        checks={green}
        truncated={false}
        fileRefusal="Fichiers hors périmètre : src/app/page.tsx"
        locale="fr"
      />,
    );
    const bouton = screen.getByRole('button');
    expect(bouton.hasAttribute('disabled')).toBe(true);
    expect(bouton.textContent).toMatch(/hors périmètre/i);
  });

  it('un bouton désactivé ne dit jamais « Publier maintenant »', () => {
    for (const checks of [running, broken, { ...green, missing: ['Content lint'] }]) {
      const { unmount } = render(
        <ActionBar number={1} sha="abc1234" checks={checks} truncated={false} fileRefusal={null} locale="fr" />,
      );
      const bouton = screen.getByRole('button');
      expect(bouton.hasAttribute('disabled')).toBe(true);
      expect(bouton.textContent).not.toMatch(/Publier maintenant/);
      unmount();
    }
  });
});

// L'auto-rafraîchissement est LE défaut que cette conception corrige : sans
// lui, on arrive pendant que les contrôles tournent — le cas nominal — et le
// bouton reste gris pour toujours. Sans les tests ci-dessous, retirer le
// `clearInterval` ne fait échouer aucun test.
describe('ActionBar, auto-rafraîchissement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('redemande la page tant que des contrôles tournent', () => {
    render(<ActionBar number={1} sha="abc1234" checks={running} truncated={false} fileRefusal={null} locale="fr" />);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20_000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('ne redemande rien quand plus rien ne tourne', () => {
    render(<ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />);
    vi.advanceTimersByTime(60_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('nettoie l\'intervalle au démontage', () => {
    const { unmount } = render(
      <ActionBar number={1} sha="abc1234" checks={running} truncated={false} fileRefusal={null} locale="fr" />,
    );
    unmount();
    vi.advanceTimersByTime(60_000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
