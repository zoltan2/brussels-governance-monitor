// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getResend, addContact, resendCall, EMAIL_FROM } from '@/lib/resend';
import { isValidCronAuth } from '@/lib/cron-auth';
import ConfirmEmail from '@/emails/confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Adresse de test de Resend : l'envoi est accepté et simulé, aucune boîte réelle ne reçoit rien. */
const ADRESSE_DE_TEST = 'delivered@resend.dev';

/**
 * Daily smoke test for the subscription pipeline.
 *
 * 1. Contact : creates a throwaway contact with all expected properties
 *    (locale, topics, sources). If Resend rejects any property, addContact
 *    throws. Background: PR #170 (2026-04-22) shipped a `sources` property
 *    that did not exist on the Resend account, silently dropping every new
 *    subscriber for 5 days before being noticed.
 * 2. Envoi (02/10/2026) : envoie le VRAI email de confirmation à l'adresse de
 *    test de Resend. Toute inscription commence par cet email : une clé
 *    révoquée, un domaine expéditeur invalidé ou un gabarit qui ne se rend plus
 *    passaient inaperçus, le contrôle ne testant que le contact.
 *
 * Les deux contrôles tournent toujours, pour dire lequel est en panne. Un seul
 * échec suffit : `[contacts-healthcheck-FAIL]` au journal et réponse 500, que
 * `bgm-cron.sh` transforme en alerte.
 */
export async function GET(request: Request) {
  if (!isValidCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }

  const probeEmail = `healthcheck-${Date.now()}@governance.brussels`;
  const erreurs: string[] = [];

  let contact: 'ok' | 'echec' = 'ok';
  try {
    await addContact(probeEmail, 'fr', ['budget'], ['healthcheck']);
  } catch (err) {
    contact = 'echec';
    erreurs.push(`contact : ${String(err)}`);
    console.error('[contacts-healthcheck-FAIL] contact', probeEmail, err);
  }

  if (contact === 'ok') {
    try {
      const resend = getResend();
      await resendCall(() => resend.contacts.remove({ email: probeEmail }));
    } catch (err) {
      console.warn('[contacts-healthcheck] cleanup failed (non-blocking)', err);
    }
  }

  let envoi: 'ok' | 'echec' = 'ok';
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
    const resend = getResend();
    const { error } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: ADRESSE_DE_TEST,
        subject: '[BGM] contrôle quotidien : email de confirmation',
        react: ConfirmEmail({
          locale: 'fr',
          confirmUrl: `${siteUrl}/fr/subscribe/confirm?token=controle-quotidien`,
        }),
        tags: [{ name: 'type', value: 'healthcheck' }],
      }),
    );
    if (error) throw new Error(`${error.name ?? 'erreur'} : ${error.message ?? JSON.stringify(error)}`);
  } catch (err) {
    envoi = 'echec';
    erreurs.push(`envoi : ${String(err)}`);
    console.error('[contacts-healthcheck-FAIL] envoi', err);
  }

  const ok = contact === 'ok' && envoi === 'ok';
  return NextResponse.json(
    { ok, contact, envoi, probedAt: new Date().toISOString(), ...(ok ? {} : { erreurs }) },
    { status: ok ? 200 : 500 },
  );
}
