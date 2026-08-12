// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { ActionBar } from './action-bar';
import type { CheckState } from '@/lib/github-pr';

// `refresh` est partagé pour pouvoir l'observer depuis les tests.
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const green: CheckState = { passed: 3, pending: 0, failed: [], total: 3, missing: [] };
const running: CheckState = { passed: 2, pending: 1, failed: [], total: 3, missing: ['Content lint'] };
const broken: CheckState = { passed: 2, pending: 0, failed: ['Content lint'], total: 3, missing: ['Content lint'] };
// GitHub n'a pas encore créé les contrôles : rien ne tourne, rien n'a réussi.
const pasEncoreCree: CheckState = { passed: 0, pending: 0, failed: [], total: 0, missing: ['Lint, Typecheck & Build'] };

describe('ActionBar', () => {
  it('le lien Retour cible le tableau de bord, pas la liste des veilles', () => {
    // `/admin/content` redirige aussitôt sur la page courante dans le cas
    // nominal (une seule veille en attente) : le bouton ne faisait rien.
    render(<ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />);
    expect(screen.getByRole('link', { name: /retour/i }).getAttribute('href')).toBe('/fr/admin');
  });

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

describe('ActionBar, publication', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('ne laisse pas le bouton bloqué quand le réseau coupe', async () => {
    // Le mode d'usage cible est le téléphone. `fetch` rejette, `setBusy(false)`
    // n'était jamais atteint : bouton « Publication… » désactivé et muet
    // jusqu'au rechargement.
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    render(
      <ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />,
    );
    const bouton = screen.getByRole('button', { name: /publier/i });
    fireEvent.click(bouton);

    await waitFor(() => {
      expect(screen.getByText(/réseau injoignable/i)).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /publier/i }).hasAttribute('disabled')).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('annonce l\'erreur réseau en role="alert", comme login-form.tsx', async () => {
    // M16 : le message était un <span> sans role="alert" — un lecteur
    // d'écran ne l'annonçait pas quand il apparaît après coup, hors focus.
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;

    render(
      <ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /publier/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/réseau injoignable/i);
    });
  });

  it('rend le bouton après un refus du serveur, avec le message du serveur', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'Fichiers hors périmètre : src/x.ts' }), {
          status: 403,
        }),
    ) as unknown as typeof fetch;

    render(
      <ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /publier/i }));

    await waitFor(() => {
      expect(screen.getByText(/src\/x\.ts/)).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /publier/i }).hasAttribute('disabled')).toBe(false);
  });

  it('rafraîchit la page après une fusion réussie', async () => {
    refresh.mockClear();
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof fetch;

    render(
      <ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />,
    );
    fireEvent.click(screen.getByRole('button', { name: /publier/i }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
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
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('sonde AUSSI quand aucun contrôle n\'existe encore — le cas d\'arrivée le plus fréquent', () => {
    // On ouvre le lien avant que GitHub ait créé les contrôles : `pending`
    // vaut 0 et `missing` n'est pas vide. Conditionner le sondage à
    // `pending > 0` laissait l'écran figé, bouton gris, sans rien qui invite
    // à recharger.
    render(
      <ActionBar
        number={1}
        sha="abc1234"
        checks={pasEncoreCree}
        truncated={false}
        fileRefusal={null}
        locale="fr"
      />,
    );
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('ne redemande rien quand plus rien ne tourne', () => {
    render(<ActionBar number={1} sha="abc1234" checks={green} truncated={false} fileRefusal={null} locale="fr" />);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('plafonne le sondage à quinze minutes, puis invite à recharger', () => {
    // Sans plafond, un contrôle coincé consomme le quota horaire GitHub —
    // vingt-quatre appels par rendu — jusqu'à ce qu'on ferme l'onglet.
    render(
      <ActionBar
        number={1}
        sha="abc1234"
        checks={running}
        truncated={false}
        fileRefusal={null}
        locale="fr"
      />,
    );
    expect(screen.queryByText(/quinze minutes/i)).toBeNull();

    act(() => { vi.advanceTimersByTime(15 * 60_000); });
    expect(refresh).toHaveBeenCalledTimes(45); // 15 min / 20 s

    // Une heure de plus : plus un seul appel.
    act(() => { vi.advanceTimersByTime(60 * 60_000); });
    expect(refresh).toHaveBeenCalledTimes(45);

    // Et l'écran ne redevient pas figé et muet.
    expect(screen.getByText(/quinze minutes/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /recharger/i })).toBeDefined();
  });

  it('n\'invite pas à recharger tant que le plafond n\'est pas atteint', () => {
    render(
      <ActionBar
        number={1}
        sha="abc1234"
        checks={running}
        truncated={false}
        fileRefusal={null}
        locale="fr"
      />,
    );
    act(() => { vi.advanceTimersByTime(14 * 60_000); });
    expect(screen.queryByText(/quinze minutes/i)).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(42);
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
