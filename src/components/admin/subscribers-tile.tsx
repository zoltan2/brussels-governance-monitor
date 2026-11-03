// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { getDb } from '@/lib/db';
import { countActiveContacts } from '@/lib/resend';
import { lireSuiviAbonnes, type SuiviAbonnes } from '@/lib/suivi-abonnes';
import { NouveauxAbonnesChart } from './nouveaux-abonnes-chart';
import { Tile, TileStat, TileUnavailable } from './tile';

/** Mise en service du registre des désabonnements, d'où part le total. */
const DEBUT_REGISTRE = '29/09/2026';

/**
 * countActiveContacts et non listActiveContacts : cette dernière fait un
 * appel API par contact, espacés de 600 ms, soit près d'une minute pour
 * quatre-vingt-dix abonnés. C'est ce qui bloquait la tuile sur son fallback.
 */
async function loadActiveCount(): Promise<number | null> {
  try {
    return await countActiveContacts();
  } catch {
    return null;
  }
}

/** Lu en local : reste affiché quand Resend ne répond pas. */
function loadSuivi(): SuiviAbonnes | null {
  try {
    const db = getDb();
    return db ? lireSuiviAbonnes(db) : null;
  } catch {
    return null;
  }
}

function dateCourte(ms: number): string {
  return new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Brussels',
  }).format(new Date(ms));
}

export async function SubscribersTile() {
  const count = await loadActiveCount();
  const suivi = loadSuivi();

  return (
    <Tile title="Abonnés">
      {count === null ? (
        <TileUnavailable reason="Resend n'a pas répondu." />
      ) : (
        <TileStat
          value={count}
          label={count === 1 ? 'abonné actif' : 'abonnés actifs'}
        />
      )}
      {suivi && (
        <>
          <h3 className="mt-4 text-sm font-medium text-neutral-700">
            Nouveaux abonnés, 12 derniers mois
          </h3>
          <div className="mt-2">
            <NouveauxAbonnesChart mois={suivi.mois} />
          </div>
          {suivi.mois.some((m) => m.statut === 'reconstitue' && m.valeur !== null) && (
            <p className="mt-1 text-xs text-neutral-600">
              En gris, avant le {dateCourte(suivi.debut)} : abonnés encore présents uniquement.
            </p>
          )}
          <dl className="mt-3 space-y-1 text-sm text-neutral-600">
            <div>
              <dt className="inline font-medium text-neutral-700">Désabonnements : </dt>
              <dd className="inline">
                {suivi.desabonnementsTotal} depuis le {DEBUT_REGISTRE} ·{' '}
                {suivi.desabonnementsCeMois} ce mois-ci
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-neutral-700">Retours : </dt>
              <dd className="inline">
                {suivi.retoursTotal} depuis le {dateCourte(suivi.debut)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </Tile>
  );
}
