// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * `linkifyDossierMarkers` lie un marqueur `[Dossier: slug]` écrit par le LLM
 * (toujours le slug CANONIQUE — contrat inchangé, voir DOSSIER_MARKER_RE dans
 * chat-widget.tsx) vers l'URL localisée du dossier. Depuis PR #593, l'URL
 * suit `routeSlug` (fourni par /api/chat/dossier-titles, lui-même dérivé de
 * `getLocalizedSlug`), pas le slug canonique du marqueur : un dossier à slug
 * NL distinct (ex. cpas-bruxellois → brusselse-ocmws) doit produire un lien
 * direct vers la nouvelle adresse, pas l'ancienne.
 */
import { describe, expect, it } from 'vitest';
import { linkifyDossierMarkers } from './chat-widget';

describe('linkifyDossierMarkers', () => {
  it('utilise routeSlug (slug localisé) pour le lien, pas le slug canonique du marqueur', () => {
    const titles = {
      'cpas-bruxellois': { title: "Brusselse OCMW's", routeSlug: 'brusselse-ocmws' },
    };
    const out = linkifyDossierMarkers('Voir [Dossier: cpas-bruxellois] pour plus.', 'nl', titles);
    expect(out).toBe("Voir [Brusselse OCMW's](/nl/dossiers/brusselse-ocmws) pour plus.");
  });

  it('le marqueur lui-même reste toujours le slug canonique (contrat LLM inchangé)', () => {
    // Le FR n'a pas de slug localisé distinct : routeSlug == slug canonique.
    const titles = { 'cpas-bruxellois': { title: 'Les 19 CPAS bruxellois', routeSlug: 'cpas-bruxellois' } };
    const out = linkifyDossierMarkers('[Dossier: cpas-bruxellois]', 'fr', titles);
    expect(out).toBe('[Les 19 CPAS bruxellois](/fr/dossiers/cpas-bruxellois)');
  });

  it('retombe sur le slug canonique pour l’URL et le libellé si la carte des titres est vide (chargement pas encore terminé)', () => {
    const out = linkifyDossierMarkers('[Dossier: cpas-bruxellois]', 'nl', {});
    expect(out).toBe('[cpas-bruxellois](/nl/dossiers/cpas-bruxellois)');
  });

  it('lie plusieurs marqueurs différents dans le même message, chacun avec son propre routeSlug', () => {
    const titles = {
      'cpas-bruxellois': { title: "Brusselse OCMW's", routeSlug: 'brusselse-ocmws' },
      lez: { title: 'LEZ', routeSlug: 'lez' },
    };
    const out = linkifyDossierMarkers(
      '[Dossier: cpas-bruxellois] et [Dossier: lez]',
      'nl',
      titles,
    );
    expect(out).toBe("[Brusselse OCMW's](/nl/dossiers/brusselse-ocmws) et [LEZ](/nl/dossiers/lez)");
  });

  it('échappe les caractères markdown du titre sans toucher au slug de l’URL', () => {
    const titles = { 'cpas-bruxellois': { title: 'CPAS [pilote]', routeSlug: 'brusselse-ocmws' } };
    const out = linkifyDossierMarkers('[Dossier: cpas-bruxellois]', 'nl', titles);
    expect(out).toBe('[CPAS \\[pilote\\]](/nl/dossiers/brusselse-ocmws)');
  });
});
