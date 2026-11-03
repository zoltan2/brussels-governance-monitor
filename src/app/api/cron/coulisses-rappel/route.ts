// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Rappel des coulisses, à faire tourner chaque jour (timer VPS, voir
 * reference cron) : à deux jours ou moins du premier jeudi, si le rendez-vous
 * n'est pas prêt (bienvenue incomplète, édition à moitié remplie, pas d'essai
 * à jour), une alerte part à l'adresse des alertes techniques (adresse-alertes.ts). Rien n'est envoyé aux abonnés : un
 * rendez-vous non prêt ne part pas, et aucun ancien contenu ne le remplace.
 */
import { NextResponse } from 'next/server';
import { isValidCronAuth } from '@/lib/cron-auth';
import { getDb } from '@/lib/db';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { adresseAlertes } from '@/lib/adresse-alertes';
import { etatAdmin, manques, joursRestants } from '@/lib/coulisses/admin';
import { jourEnClair } from '@/lib/coulisses/calendrier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isValidCronAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Base non configurée' }, { status: 503 });

  const maintenant = new Date();
  const e = etatAdmin(db, null, maintenant.getTime());
  const restants = joursRestants(e.jour, maintenant);
  if (restants < 0 || restants > 2) return NextResponse.json({ ok: true, rappel: false, mois: e.mois, restants });

  const m = manques(e);
  if (m.length === 0) return NextResponse.json({ ok: true, rappel: false, mois: e.mois, restants });

  const a = adresseAlertes();
  if (!a) return NextResponse.json({ error: 'alert recipient is not configured' }, { status: 500 });
  const { error } = await resendCall(() =>
    getResend().emails.send({
      from: EMAIL_FROM,
      to: a,
      subject: `[BGM Coulisses] Rendez-vous du ${jourEnClair(e.jour)} pas prêt`,
      text: [
        `Rendez-vous des coulisses : ${jourEnClair(e.jour)} (${restants === 0 ? "aujourd'hui" : `dans ${restants} jour(s)`}).`,
        '',
        ...m.map((x) => `- ${x}`),
        '',
        'Rien ne part tant que ce n’est pas réglé. Admin : /fr/admin/coulisses',
      ].join('\n'),
      tags: [{ name: 'type', value: 'coulisses-rappel' }],
    }),
  );
  if (error) return NextResponse.json({ ok: false, error: String(error.message ?? 'Resend') }, { status: 502 });
  return NextResponse.json({ ok: true, rappel: true, mois: e.mois, restants, manques: m.length });
}
