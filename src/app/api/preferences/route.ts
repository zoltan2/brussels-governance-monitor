// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/token';
import {
  getResend,
  EMAIL_FROM,
  getContact,
  updateContactPreferences,
  TOPICS,
  resendCall,
} from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import PreferencesUpdatedEmail from '@/emails/preferences-updated';

const VALID_LOCALES = ['fr', 'nl', 'en', 'de'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing token' },
      { status: 400 },
    );
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 },
    );
  }

  try {
    const contact = await getContact(payload.email);
    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      email: payload.email,
      locale: contact.locale,
      topics: contact.topics,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: { token?: string; topics?: string[]; locale?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, topics, locale } = body;

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 },
    );
  }

  if (!Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json(
      { error: 'At least one topic is required' },
      { status: 400 },
    );
  }

  const validTopics = topics.filter((t): t is string =>
    TOPICS.includes(t as typeof TOPICS[number]),
  );
  if (validTopics.length === 0) {
    return NextResponse.json(
      { error: 'No valid topics provided' },
      { status: 400 },
    );
  }

  const selectedLocale =
    locale && VALID_LOCALES.includes(locale) ? locale : 'fr';

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 },
    );
  }

  try {
    await updateContactPreferences(payload.email, selectedLocale, validTopics);

    // Send confirmation email
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const unsubToken = generateUnsubscribeToken(payload.email);
    const preferencesUrl = `${siteUrl}/${selectedLocale}/subscribe/preferences?token=${encodeURIComponent(unsubToken)}`;

    const prefSubjects: Record<string, string> = {
      fr: 'Vos préférences ont été mises à jour',
      nl: 'Uw voorkeuren zijn bijgewerkt',
      en: 'Your preferences have been updated',
      de: 'Ihre Einstellungen wurden aktualisiert',
    };

    const resend = getResend();
    await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: payload.email,
        subject: prefSubjects[selectedLocale] || prefSubjects.fr,
        react: PreferencesUpdatedEmail({
          locale: selectedLocale,
          topics: validTopics,
          preferencesUrl,
        }),
        tags: [
          { name: 'type', value: 'preferences-updated' },
          { name: 'locale', value: selectedLocale },
        ],
      }),
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 },
    );
  }
}
