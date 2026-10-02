// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { countActiveContacts, listActiveContacts } from '@/lib/resend';
import { isValidCronAuth } from '@/lib/cron-auth';
import { collectDigestUpdates, filterUpdatesForSubscriber } from '@/lib/digest-updates';
import { calculerThemesMuets } from '@/lib/themes-muets';
import { ecrireFichierThemesMuets } from '@/lib/themes-muets-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Calcule une fois par jour les thèmes en silence et les abonnés qui ne
 * reçoivent plus rien, et dépose l'instantané pour la tuile de l'administration.
 *
 * ⚠ `listActiveContacts` s'arrête sans rien dire sur une erreur de Resend et
 * saute un contact dont le détail ne revient pas : une liste partielle
 * donnerait des comptes faux qui passeraient pour justes. On la confronte donc
 * au décompte simple (`countActiveContacts`). En cas d'écart, rien n'est écrit
 * et la tâche échoue : l'ancien instantané vieillit, la tuile le dit.
 */
export async function GET(request: Request) {
  if (!isValidCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }

  try {
    const attendus = await countActiveContacts();
    const contacts = await listActiveContacts();
    if (attendus === null || contacts.length !== attendus) {
      console.error('[themes-muets-FAIL] liste des abonnés incomplète', { attendus, lus: contacts.length });
      return NextResponse.json(
        { ok: false, error: 'liste des abonnés incomplète', attendus, lus: contacts.length },
        { status: 500 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
    // Coupure vide : toutes les fiches, chacune avec sa date de modification.
    const fiches = (collectDigestUpdates('', siteUrl).byLocale.fr ?? []).flatMap((u) =>
      u.lastModified ? [{ ...u, lastModified: u.lastModified }] : [],
    );
    if (fiches.length === 0) {
      console.error('[themes-muets-FAIL] aucune fiche lue');
      return NextResponse.json({ ok: false, error: 'aucune fiche lue' }, { status: 500 });
    }

    const instantane = calculerThemesMuets({
      contacts: contacts.map((c) => ({ topics: c.topics })),
      fiches,
      maintenant: new Date(),
      filtrer: (f, themes) => filterUpdatesForSubscriber(f, themes) as typeof f,
    });
    await ecrireFichierThemesMuets(instantane);

    return NextResponse.json({
      ok: true,
      calculeLe: instantane.calculeLe,
      abonnes: instantane.abonnes,
      abonnesEnSilence: instantane.abonnesEnSilence,
      themesMuets: instantane.themesMuets.length,
    });
  } catch (err) {
    console.error('[themes-muets-FAIL]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
