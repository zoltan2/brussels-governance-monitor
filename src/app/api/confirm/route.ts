// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { verifyConfirmToken, generateUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM, addContact, getContact, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import { pseudonymeEmail } from '@/lib/log-safe';
import { estUnRetour, oublierDesabonnement } from '@/lib/desabonnements';
import WelcomeEmail from '@/emails/welcome';
import { clientIp } from '@/lib/client-ip';

const welcomeSubjects: Record<string, string> = {
  fr: 'Bienvenue sur Brussels Governance Monitor',
  nl: 'Welkom bij Brussels Governance Monitor',
  en: 'Welcome to Brussels Governance Monitor',
  de: 'Willkommen bei Brussels Governance Monitor',
};

export async function POST(request: Request) {
  try {
    const ip = clientIp(request.headers);
    const { allowed } = rateLimit(ip, { bucket: 'confirm' });
    if (!allowed) {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
    }

    const body = await request.json();
    const token = body.token;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'missing_token' }, { status: 400 });
    }

    const payload = verifyConfirmToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'expired' }, { status: 410 });
    }

    const { email, locale, topics, source } = payload;
    // Réabonnement : l'empreinte de l'adresse figure au registre des
    // désabonnements (24 mois). Le contact reçoit la source `retour`, puis la
    // ligne est effacée, une fois l'abonnement réellement enregistré.
    const retour = estUnRetour(email);
    const nouvellesSources = [source, retour ? 'retour' : undefined].filter(
      (s): s is string => Boolean(s),
    );

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
    }

    // If contact already exists, merge topics AND sources instead of ignoring.
    const existing = await getContact(email);
    if (existing) {
      const mergedTopics = [...new Set([...existing.topics, ...topics])];
      const mergedSources = [...new Set([...existing.sources, ...nouvellesSources])];
      const topicsChanged = mergedTopics.length !== existing.topics.length;
      const sourcesChanged = mergedSources.length !== existing.sources.length;
      if (topicsChanged || sourcesChanged) {
        const { updateContactPreferences } = await import('@/lib/resend');
        await updateContactPreferences(
          email,
          existing.locale,
          mergedTopics,
          mergedSources,
        );
      }
      if (retour) oublierDesabonnement(email);
      return NextResponse.json({ success: true, topics: mergedTopics, alreadyConfirmed: true });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';
    const unsubToken = generateUnsubscribeToken(email);
    const unsubscribeUrl = `${siteUrl}/${locale}/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;
    const resend = getResend();

    await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: welcomeSubjects[locale] || welcomeSubjects.fr,
        react: WelcomeEmail({
          locale,
          topics,
          unsubscribeUrl,
        }),
        tags: [
          { name: 'type', value: 'welcome' },
          { name: 'locale', value: locale },
          { name: 'topics', value: topics.join('-') },
        ],
      }),
    );

    // Persist subscriber in Resend Contacts with their origin tag.
    try {
      await addContact(email, locale, topics, nouvellesSources);
      if (retour) oublierDesabonnement(email);
    } catch (err) {
      console.error('Confirm: addContact failed — subscriber received welcome email but was NOT persisted:', pseudonymeEmail(email), err);
    }

    return NextResponse.json({ success: true, topics });
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
