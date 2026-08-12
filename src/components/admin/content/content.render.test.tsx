// @vitest-environment jsdom
// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Verdict } from './verdict';
import { ChainStateBanner } from './chain-state';
import { ContentChanges } from './content-changes';
import { chainState } from '@/lib/publication-deadlines';
import { fileSetRefusal } from '@/lib/mergeable-files';
import type { ContentPr, CheckState, PrFile } from '@/lib/github-pr';
import type { DigestSnapshot } from '@/lib/publication-deadlines';
import type { SummaryChange } from '@/lib/change-summary';

const pr: ContentPr = {
  number: 400,
  title: 'veille: 2026-w33',
  body: 'Corps de la PR.',
  branch: 'content/veille-2026-w33',
  sha: 'abcdef1234567890',
  baseSha: 'base567890abcdef',
  baseRef: 'main',
  headRepo: 'zoltan2/brussels-governance-monitor',
  createdAt: '2026-08-09T06:00:00Z',
  mergedAt: null,
};

describe('Verdict', () => {
  it('annonce « prêt » quand tout est vert', () => {
    const checks: CheckState = { passed: 3, pending: 0, failed: [], total: 3, missing: [] };
    render(
      <Verdict
        pr={pr}
        checks={checks}
        truncated={false}
        fileRefusal={null}
        now={new Date('2026-08-09T10:00:00Z')}
      />,
    );
    expect(screen.getByText(/Prêt à publier/i)).toBeDefined();
  });

  it('nomme le contrôle qui bloque', () => {
    const checks: CheckState = { passed: 2, pending: 0, failed: ['Content lint'], total: 3, missing: ['Content lint'] };
    render(
      <Verdict
        pr={pr}
        checks={checks}
        truncated={false}
        fileRefusal={null}
        now={new Date('2026-08-09T10:00:00Z')}
      />,
    );
    expect(screen.getByText(/Content lint/)).toBeDefined();
  });

  it('affiche la progression tant que les contrôles tournent', () => {
    const checks: CheckState = { passed: 2, pending: 1, failed: [], total: 3, missing: ['Content lint'] };
    render(
      <Verdict
        pr={pr}
        checks={checks}
        truncated={false}
        fileRefusal={null}
        now={new Date('2026-08-09T10:00:00Z')}
      />,
    );
    expect(screen.getByText(/2\s*\/\s*3/)).toBeDefined();
  });

  it('annonce les contrôles requis manquants, pas « prêt »', () => {
    // Une PR de fork n'exécute aucun workflow : zéro échec, et pourtant rien
    // n'a été vérifié. L'écran ne doit pas dire « prêt ».
    const checks: CheckState = {
      passed: 0,
      pending: 0,
      failed: [],
      total: 0,
      missing: ['Lint, Typecheck & Build'],
    };
    render(
      <Verdict
        pr={pr}
        checks={checks}
        truncated={false}
        fileRefusal={null}
        now={new Date('2026-08-09T10:00:00Z')}
      />,
    );
    expect(screen.getByText(/Contrôles manquants/i)).toBeDefined();
    expect(screen.queryByText(/Prêt à publier/i)).toBeNull();
  });

  it('annonce la troncature, qui fait refuser le serveur', () => {
    const checks: CheckState = {
      passed: 3,
      pending: 0,
      failed: [],
      total: 3,
      missing: [],
    };
    render(
      <Verdict
        pr={pr}
        checks={checks}
        truncated={true}
        fileRefusal={null}
        now={new Date('2026-08-09T10:00:00Z')}
      />,
    );
    expect(screen.getByText(/liste de fichiers incomplète/i)).toBeDefined();
    expect(screen.queryByText(/Prêt à publier/i)).toBeNull();
  });

  it('annonce le fichier hors périmètre, pas « prêt », même tout vert', () => {
    // Le défaut : « Prêt à publier », bouton actif, 403 au clic. Le verdict
    // doit nommer le fichier en cause.
    const checks: CheckState = { passed: 3, pending: 0, failed: [], total: 3, missing: [] };
    render(
      <Verdict
        pr={pr}
        checks={checks}
        truncated={false}
        fileRefusal={fileSetRefusal(['content/x.fr.mdx', 'src/app/page.tsx'])}
        now={new Date('2026-08-09T10:00:00Z')}
      />,
    );
    expect(screen.getByText(/src\/app\/page\.tsx/)).toBeDefined();
    expect(screen.queryByText(/Prêt à publier/i)).toBeNull();
  });

  it('affiche l\'âge de la PR, jamais montré en v2', () => {
    const checks: CheckState = { passed: 3, pending: 0, failed: [], total: 3, missing: [] };
    render(
      <Verdict
        pr={pr}
        checks={checks}
        truncated={false}
        fileRefusal={null}
        now={new Date('2026-08-09T10:00:00Z')}
      />,
    );
    expect(screen.getByText(/4 heures/i)).toBeDefined();
  });
});

describe('ChainStateBanner', () => {
  const wednesday = new Date('2026-08-12T09:00:00Z');

  // Le brief ne fournissait pas ces fixtures (`w33ouvert` / `w33approuve`
  // n'étaient définies nulle part, une ReferenceError à l'exécution) : elles
  // sont reconstruites ici à partir de `DigestSnapshot`. `weekStart` place le
  // brouillon dans la semaine de `wednesday` (lundi 2026-08-10, ISO
  // semaine 33) pour rester sous la borne des sept jours d'`emailPhase` et
  // ne pas retomber dans la branche « brouillon d'une semaine révolue ».
  const w33ouvert: DigestSnapshot = {
    approved: false,
    sent: false,
    week: '2026-w33',
    weekStart: '2026-08-10',
  };
  const w33approuve: DigestSnapshot = {
    approved: true,
    sent: false,
    week: '2026-w33',
    weekStart: '2026-08-10',
  };

  it('rassure quand le digest n\'est pas encore approuvé', () => {
    const state = chainState(w33ouvert, wednesday);
    render(<ChainStateBanner state={state} />);
    expect(screen.getByText(/sera dans l'email des abonnés/i)).toBeDefined();
  });

  it('parle fort quand le digest est déjà approuvé', () => {
    const state = chainState(w33approuve, wednesday);
    render(<ChainStateBanner state={state} />);
    expect(screen.getByText(/ne sera pas dans l'email/i)).toBeDefined();
  });

  it('parle fort aussi quand l\'état est illisible', () => {
    render(<ChainStateBanner state={chainState(null, wednesday)} />);
    expect(screen.getByText(/illisible/i)).toBeDefined();
  });
});

describe('ContentChanges', () => {
  const files: PrFile[] = [
    { path: 'content/domain-cards/mobilite.fr.mdx', status: 'modified', additions: 4, deletions: 2 },
    { path: 'content/domain-cards/mobilite.nl.mdx', status: 'modified', additions: 4, deletions: 2 },
    { path: 'public/pagefind/fragment/x.pf_fragment', status: 'added', additions: 1, deletions: 0 },
  ];

  const summaries: SummaryChange[] = [
    {
      path: 'content/domain-cards/mobilite.fr.mdx',
      label: 'domain-cards/mobilite',
      before: 'Le budget était de 12 millions.',
      after: 'Le budget passe à 18 millions.',
      numbers: ['18'],
      unreadable: false,
    },
  ];

  it('ne montre que les fiches françaises', () => {
    render(<ContentChanges files={files} truncated={false} summaries={summaries} />);
    // `getByText(/mobilite/)` trouverait deux nœuds : la fiche française et
    // sa traduction néerlandaise dans le <details>. Viser la chaîne exacte.
    expect(screen.getByText('domain-cards/mobilite')).toBeDefined();
    expect(screen.queryByText(/pf_fragment/)).toBeNull();
  });

  it('avertit du plafond quand la troncature vient d\'un plafond de pages atteint', () => {
    render(
      <ContentChanges
        files={files}
        truncated={true}
        truncatedReason="plafond-atteint"
        summaries={summaries}
      />,
    );
    expect(screen.getByText(/liste incomplète/i)).toBeDefined();
    expect(screen.getByText(/limite autorisée/i)).toBeDefined();
  });

  it('n\'accuse pas le plafond quand la troncature vient d\'une page qui a échoué', () => {
    // M15 : une page en échec (403 de quota, 500…) n'a rien à voir avec le
    // plafond de 3000 fichiers. Le message affirmait auparavant « GitHub a
    // renvoyé plus de fichiers que la limite autorisée » dans les deux cas,
    // ce qui est faux ici et envoie diagnostiquer au mauvais endroit.
    render(
      <ContentChanges
        files={files}
        truncated={true}
        truncatedReason="page-echouee"
        summaries={summaries}
      />,
    );
    expect(screen.getByText(/liste incomplète/i)).toBeDefined();
    expect(screen.queryByText(/limite autorisée/i)).toBeNull();
  });

  it('dit « illisible », jamais « aucun résumé », quand la lecture a échoué', () => {
    // Les deux états sont strictement indiscernables si l'écran se tait : un
    // 403 de quota rendait le panneau vide pour TOUTES les fiches.
    const illisible: SummaryChange[] = [
      {
        path: 'content/domain-cards/mobilite.fr.mdx',
        label: 'domain-cards/mobilite',
        before: null,
        after: null,
        numbers: [],
        unreadable: true,
      },
    ];
    render(<ContentChanges files={files} truncated={false} summaries={illisible} />);
    expect(screen.getByText(/résumé illisible/i)).toBeDefined();
    expect(screen.queryByText(/aucun résumé de changement/i)).toBeNull();
  });

  it('dit « aucun résumé » quand la fiche est bien lue mais sans changeSummary', () => {
    const sansResume: SummaryChange[] = [
      {
        path: 'content/domain-cards/mobilite.fr.mdx',
        label: 'domain-cards/mobilite',
        before: null,
        after: null,
        numbers: [],
        unreadable: false,
      },
    ];
    render(<ContentChanges files={files} truncated={false} summaries={sansResume} />);
    expect(screen.getByText(/aucun résumé de changement/i)).toBeDefined();
    expect(screen.queryByText(/résumé illisible/i)).toBeNull();
  });
});
