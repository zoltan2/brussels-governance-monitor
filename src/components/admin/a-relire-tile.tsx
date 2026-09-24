// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { chargerElementsARelire } from '@/lib/a-relire';
import { getDraftCards } from '@/lib/content';
import type { Locale } from '@/i18n/routing';
import { Tile, TileStat, TileUnavailable } from './tile';

/**
 * Tuile de synthèse de /admin/relecture : remplace l'ancienne tuile
 * « Brouillons » (src/components/admin/drafts-tile.tsx, supprimée), dont le
 * rôle est repris ici comme composante du total, avec les vérifications en
 * retard (src/lib/verification-due.ts).
 *
 * Le total n'invente jamais un chiffre pour la partie indisponible (pages
 * IA périmées quand le rapport SEO est en panne) : il additionne ce qui est
 * connu et le dit dans le détail, plutôt que de compter cette part comme
 * zéro.
 */
export async function ARelireTile({ locale }: { locale: string }) {
  let elements: Awaited<ReturnType<typeof chargerElementsARelire>>;
  let drafts: number;
  try {
    elements = await chargerElementsARelire();
    drafts = getDraftCards(locale as Locale).length;
  } catch {
    return (
      <Tile title="À relire">
        <TileUnavailable reason="Collections de contenu illisibles." />
      </Tile>
    );
  }

  const total =
    elements.faq.length +
    elements.chapeau.length +
    elements.verifications.length +
    drafts +
    (elements.pagesIa?.length ?? 0);

  return (
    <Tile title="À relire" href={`/${locale}/admin/relecture`} linkLabel="Ouvrir la relecture">
      <TileStat value={total} label={total === 1 ? 'élément à relire' : 'éléments à relire'} />

      <dl className="mt-3 space-y-1 border-t border-neutral-200 pt-3 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Pages IA périmées</dt>
          <dd className="text-right tabular-nums text-neutral-700">
            {elements.pagesIa === null ? 'indisponible' : elements.pagesIa.length}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">FAQ en retard</dt>
          <dd className="text-right tabular-nums text-neutral-700">{elements.faq.length}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Chapeaux périmés</dt>
          <dd className="text-right tabular-nums text-neutral-700">{elements.chapeau.length}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Vérifications en retard</dt>
          <dd className="text-right tabular-nums text-neutral-700">{elements.verifications.length}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-neutral-500">Brouillons</dt>
          <dd className="text-right tabular-nums text-neutral-700">{drafts}</dd>
        </div>
      </dl>
    </Tile>
  );
}
