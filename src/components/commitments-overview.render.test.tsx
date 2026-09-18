// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { render, cleanup } from '@testing-library/react';
import * as matchers from 'vitest-axe/matchers';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it } from 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';
import type { CommitmentLike } from '@/lib/commitment-status';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
expect.extend(matchers);

import { NextIntlClientProvider } from 'next-intl';
import { CommitmentsOverview } from './commitments-overview';
import fr from '../../messages/fr.json';
import nl from '../../messages/nl.json';
import en from '../../messages/en.json';
import de from '../../messages/de.json';

// Les VRAIS messages, pas une traduction qui renvoie la clé : c'est ce qui a laissé
// passer un composant écrit en français en dur, affiché tel quel sur les pages
// nl, en et de (constaté le 18/09/2026).
const MESSAGES = { fr, nl, en, de } as const;
function rendre(commitments: Deadline[], locale: keyof typeof MESSAGES = 'fr') {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <CommitmentsOverview commitments={commitments} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

type Deadline = CommitmentLike & { deadline: string };

function engagement(id: string, status: string, deadline: string): Deadline {
  return { id, target: { fr: `Promesse ${id}` }, statusHistory: [{ status }], deadline };
}

const LOT: Deadline[] = [
  engagement('a', 'in-legislation', '2026'),
  engagement('b', 'in-legislation', '2026'),
  engagement('c', 'announced', '2027'),
  engagement('d', 'delayed', '2027'),
  engagement('e', 'not-started', '2029'),
];

describe('CommitmentsOverview', () => {
  it('met le verdict en toutes lettres dans le titre, au pluriel juste', () => {
    const { container } = rendre(LOT);
    expect(container.querySelector('h2')!.textContent).toBe(
      'Aucune des 5 promesses chiffrées n’est mise en œuvre à ce jour',
    );
  });

  it('accorde le verdict au singulier quand une seule promesse est tenue', () => {
    const lot = [...LOT, engagement('f', 'implemented', '2026')];
    const { container } = rendre(lot);
    expect(container.querySelector('h2')!.textContent).toContain('1 promesse chiffrée sur 6');
  });

  it('donne un nom accessible chiffré à chaque ruban, ceux-ci étant des images', () => {
    // Les rubans sont role="img" : sans aria-label, la répartition serait muette.
    const { container } = rendre(LOT);
    const rubans = [...container.querySelectorAll('[role="img"]')];
    expect(rubans.length).toBe(1 + 3); // global + une échéance par année
    expect(rubans[0].getAttribute('aria-label')).toContain('Répartition des 5 engagements');
  });

  it('trie les échéances chronologiquement, une ligne par année', () => {
    const { container } = rendre(LOT);
    const annees = [...container.querySelectorAll('li span:first-child')]
      .map((s) => s.textContent!.trim())
      .filter((t) => /^\d{4}$/.test(t));
    expect(annees).toEqual(['2026', '2027', '2029']);
  });

  it('accorde le nombre de promesses par échéance', () => {
    const { container } = rendre(LOT);
    expect(container.textContent).toContain('2 promesses');
    expect(container.textContent).toContain('1 promesse');
  });

  it('garde « mis en œuvre » dans la légende à zéro, et son pourcentage', () => {
    const { container } = rendre(LOT);
    expect(container.textContent).toContain('Mis en œuvre');
    expect(container.textContent).toMatch(/0\s%/u);
  });

  it('ne déduit aucun retard d’une échéance : seul le statut delayed le dit', () => {
    // Une promesse 2026 « en cours législatif » n'est pas en retard tant que l'année court.
    const { container } = rendre([engagement('a', 'in-legislation', '2026')]);
    expect(container.textContent).not.toContain('Retardé');
  });

  // Tout ce qui s'affiche ou se lit à voix haute, libellés accessibles et infobulles
  // compris : c'est là que le français codé en dur restait invisible à l'œil.
  function texteComplet(container: HTMLElement): string {
    const attributs = [...container.querySelectorAll('[aria-label], [title]')].flatMap((el) => [
      el.getAttribute('aria-label') ?? '',
      el.getAttribute('title') ?? '',
    ]);
    return [container.textContent ?? '', ...attributs].join(' ');
  }

  it.each(['nl', 'en', 'de'] as const)("n'affiche aucun mot français sur la page %s", (locale) => {
    const { container } = rendre(LOT, locale);
    const texte = texteComplet(container);
    for (const mot of ['promesse', 'chiffrée', 'Échéance', 'Répartition', ' sur ', 'Aucune', 'mise en œuvre']) {
      expect(texte, `« ${mot} » sur la page ${locale}`).not.toContain(mot);
    }
  });

  it.each([
    ['nl', 'Geen van de 5 becijferde beloften is vandaag uitgevoerd', '2 beloften'],
    ['en', 'None of the 5 quantified promises has been implemented to date', '2 promises'],
    ['de', 'Keine der 5 bezifferten Zusagen ist bisher umgesetzt', '2 Zusagen'],
  ] as const)('traduit le verdict et accorde le pluriel en %s', (locale, verdict, pluriel) => {
    const { container } = rendre(LOT, locale);
    expect(container.querySelector('h2')!.textContent).toBe(verdict);
    expect(container.textContent).toContain(pluriel);
  });

  it('suit la typographie de chaque langue : « Label : 2 » en français, « Label: 2 » ailleurs', () => {
    expect(texteComplet(rendre(LOT, 'fr').container)).toContain('En cours législatif : 2');
    cleanup();
    expect(texteComplet(rendre(LOT, 'nl').container)).toContain('In wetgevend proces: 2');
  });

  it("n'a aucune violation d'accessibilité", async () => {
    const { container } = rendre(LOT);
    expect(await axe(container)).toHaveNoViolations();
  });
});
