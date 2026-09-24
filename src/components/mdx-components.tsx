// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Pas de directive : ce module est partagé par le rendu client
// (`mdx-content.tsx`) et le rendu serveur des dossiers
// (`dossier-mdx-content.tsx`). Next le compile une fois pour chaque graphe.
//
// ⛔ N'importer ICI AUCUN composant de dossier (`@/components/dossiers/*`) :
// tout ce que ce module importe part en JS sur chaque page qui rend du MDX
// (communes, digest, domaines, secteurs…). Les composants de dossier vont
// dans `@/components/dossiers/mdx-components`, rendu côté serveur seulement.
// Garde : `src/components/mdx-bundle-boundary.test.ts`.

import * as runtime from 'react/jsx-runtime';
import type { ComponentType, ReactElement } from 'react';
import { Claim } from '@/components/mdx/claim';
import { Signal, Essentiel, Complet } from '@/components/dossier/density/density-layer';
import { SignalLead } from '@/components/dossier/density/signal-lead';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MdxComponents = Record<string, ComponentType<any>>;

export const baseMdxComponents: MdxComponents = {
  Claim,
  Signal,
  Essentiel,
  Complet,
  SignalLead,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-3 mt-10 border-b border-neutral-200 pb-2 text-lg font-bold text-neutral-900" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-neutral-800" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-sm leading-relaxed text-neutral-700" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 ml-4 list-disc space-y-1 text-sm text-neutral-700" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 ml-4 list-decimal space-y-1 text-sm text-neutral-700" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-neutral-900" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-brand-700 underline underline-offset-2 hover:text-brand-900"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-4 border-l-2 border-brand-600 pl-4 text-sm italic text-neutral-600"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    // tabIndex={0} : une zone défilante doit être atteignable au clavier, sinon
    // un tableau large est illisible sans souris (axe scrollable-region-focusable,
    // constaté à 390 px sur toute page MDX portant un tableau). Pas de role="region"
    // ici : une région sans nom accessible créerait une violation de plus, et ce
    // composant n'a pas accès aux traductions.
    <div tabIndex={0} className="my-4 overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-neutral-100 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500" {...props} />
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-2.5" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-t border-neutral-100 px-4 py-2.5 text-neutral-700" {...props} />
  ),
  tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="even:bg-neutral-100/50" {...props} />
  ),
};

/**
 * Évalue le module MDX compilé par Velite (`s.mdx()` : corps de fonction qui
 * lit le runtime JSX dans `arguments[0]`) et rend son composant par défaut
 * avec la table `components`. Fonctionne côté client comme côté serveur.
 */
export function renderMdx(code: string, components: MdxComponents): ReactElement {
  const fn = new Function(code);
  const Component: ComponentType<{ components: MdxComponents }> = fn({ ...runtime }).default;
  return <Component components={components} />;
}
