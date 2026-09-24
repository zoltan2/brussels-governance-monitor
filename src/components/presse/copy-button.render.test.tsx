// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Bouton de copie de la page Presse & données : succès annoncé, échec et
 * absence d'API retombant sur la sélection du texte, jamais un faux « copié ».
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics', () => ({ track }));

import { CopyButton } from './copy-button';

const TEXTE = 'Brussels Governance Monitor est un projet   citoyen\n indépendant.';

function monter() {
  return render(
    <div>
      <p id="cible">{TEXTE}</p>
      <CopyButton
        targetId="cible"
        label="Copier le texte"
        copiedMessage="COPIÉ"
        selectedMessage="SÉLECTIONNÉ"
        event="presse-copie-courte"
        eventData={{ slug: 'x' }}
      />
    </div>,
  );
}

function definirPressePapiers(valeur: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value: valeur, configurable: true });
}

beforeEach(() => {
  track.mockClear();
  window.getSelection()?.removeAllRanges();
});

afterEach(() => {
  cleanup();
  definirPressePapiers(undefined);
});

describe('CopyButton', () => {
  it('est un vrai bouton, atteignable au clavier, relié au texte qu’il copie', () => {
    monter();
    const bouton = screen.getByRole('button', { name: 'Copier le texte' });
    expect(bouton.getAttribute('type')).toBe('button');
    expect(bouton.getAttribute('aria-controls')).toBe('cible');
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
    // La région annoncée existe AVANT le clic, vide : sinon le lecteur d'écran
    // peut ne rien dire au premier message.
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('succès : copie le texte visible, l’annonce et mesure sans envoyer le texte', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    definirPressePapiers({ writeText });
    monter();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('COPIÉ'));
    expect(writeText).toHaveBeenCalledWith('Brussels Governance Monitor est un projet citoyen indépendant.');
    expect(track).toHaveBeenCalledWith('presse-copie-courte', { slug: 'x' });
    expect(JSON.stringify(track.mock.calls)).not.toContain('citoyen');
  });

  it('échec du presse-papiers : sélectionne le texte, ne prétend pas avoir copié', async () => {
    definirPressePapiers({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });
    monter();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('SÉLECTIONNÉ'));
    expect(screen.getByRole('status').textContent).not.toContain('COPIÉ');
    expect(window.getSelection()?.toString()).toContain('projet');
    expect(track).not.toHaveBeenCalled();
  });

  it('API absente : repli sur la sélection du texte', async () => {
    definirPressePapiers(undefined);
    monter();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('SÉLECTIONNÉ'));
    expect(window.getSelection()?.toString()).toContain('Brussels Governance Monitor');
    expect(track).not.toHaveBeenCalled();
  });
});
