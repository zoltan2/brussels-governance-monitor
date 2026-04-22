// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { verifyConfirmToken, generateUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM, addContact, getContact, resendCall } from '@/lib/resend';
import { rateLimit } from '@/lib/rate-limit';
import WelcomeEmail from '@/emails/welcome';

const welcomeSubjects: Record<string, string> = {
  fr: 'Bienvenue sur Brussels Governance Monitor',
  nl: 'Welkom bij Brussels Governance Monitor',
  en: 'Welcome to Brussels Governance Monitor',
  de: 'Willkommen bei Brussels Governance Monitor',
};

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { allowed } = rateLimit(ip);
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

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
    }

    // If contact already exists, merge topics AND sources instead of ignoring.
    const existing = await getContact(email);
    if (existing) {
      const mergedTopics = [...new Set([...existing.topics, ...topics])];
      const mergedSources = source
        ? [...new Set([...existing.sources, source])]
        : existing.sources;
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
      await addContact(email, locale, topics, source ? [source] : []);
    } catch (err) {
      console.error('Confirm: addContact failed — subscriber received welcome email but was NOT persisted:', email, err);
    }

    return NextResponse.json({ success: true, topics });
  } catch {
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
