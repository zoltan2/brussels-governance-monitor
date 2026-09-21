// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getResend,
  EMAIL_FROM,
  getContact,
  estDesinscrit,
  getTopics,
  resendCall,
} from '@/lib/resend';
import { generateConfirmToken } from '@/lib/token';
import { rateLimit } from '@/lib/rate-limit';
import ConfirmEmail from '@/emails/confirm';
import { clientIp } from '@/lib/client-ip';
import { bodyTooLargeRefusal } from '@/lib/request-guards';

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['fr', 'nl', 'en', 'de']),
  topics: z.array(z.string().min(1)).min(1),
  website: z.string().max(0).optional(), // honeypot field — must be empty
});

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = clientIp(request.headers);
    const { allowed, remaining } = rateLimit(ip, { bucket: 'subscribe' });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(remaining) },
        },
      );
    }

    const tropGros = bodyTooLargeRefusal(request.headers);
    if (tropGros) {
      return NextResponse.json({ error: tropGros }, { status: 413 });
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    // Honeypot check — if the hidden field has a value, it's a bot
    if (parsed.success && parsed.data.website) {
      // Silently accept to not reveal the honeypot
      return NextResponse.json({ success: true, requiresConfirmation: true });
    }

    if (!parsed.success) {
      // Le detail du schema exposait la forme exacte des champs, y compris le
      // nom du champ piege `website` — que le piege existe justement pour
      // cacher. Un robot lisait la reponse d'erreur et savait quoi laisser vide.
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { email, locale } = parsed.data;

    // Liste blanche des themes. Le schema n'imposait ni borne de taille ni
    // valeurs connues : un tableau de 100 000 chaines d'un Mo etait accepte,
    // signe dans le jeton, puis recopie dans les etiquettes du contact Resend.
    // `/api/preferences` filtrait deja correctement ; cette route non.
    const themesConnus = new Set(getTopics());
    const topics = parsed.data.topics.filter((t) => themesConnus.has(t));
    if (topics.length === 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Subscribe: RESEND_API_KEY is not set');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 },
      );
    }

    // Adresse deja connue : on ne touche RIEN et on repond exactement comme
    // pour une adresse inconnue.
    //
    // Ce que faisait cette branche : elle fusionnait les themes fournis par
    // l'appelant dans le contact de la victime, ecrivait la langue fournie par
    // l'appelant, et RENVOYAIT la liste complete de ses themes. Sans jeton, sans
    // confirmation, et sans qu'aucun email ne la previenne. Trois consequences :
    //   - on apprenait qu'une adresse donnee est abonnee (enumeration) ;
    //   - on apprenait a quoi elle s'interesse, donc ses centres d'interet
    //     politiques, sur un site de surveillance de la gouvernance ;
    //   - on basculait son digest dans une autre langue.
    // Toute modification d'un contact existant passe desormais par le circuit a
    // jeton de `/api/preferences`, qui envoie un accuse (audit 21/09).
    const existing = await getContact(email);
    if (existing) {
      return NextResponse.json({ success: true, requiresConfirmation: true });
    }

    // Personne desinscrite : on ne lui ecrit PAS. `getContact` filtre les
    // desinscrits, donc elle revenait « inconnue » et recevait un nouvel email
    // de confirmation — a quelqu'un qui avait explicitement demande a ne plus
    // en recevoir. La reponse reste la meme que pour une adresse inconnue.
    if (await estDesinscrit(email)) {
      return NextResponse.json({ success: true, requiresConfirmation: true });
    }

    // New subscriber — send confirmation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const token = generateConfirmToken({ email, locale, topics, source: 'website' });
    const confirmUrl = `${siteUrl}/${locale}/subscribe/confirm?token=${encodeURIComponent(token)}`;

    const resend = getResend();
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: {
          fr: 'Confirmez votre inscription — Brussels Governance Monitor',
          nl: 'Bevestig uw inschrijving — Brussels Governance Monitor',
          en: 'Confirm your subscription — Brussels Governance Monitor',
          de: 'Bestätigen Sie Ihre Anmeldung — Brussels Governance Monitor',
        }[locale] || 'Confirmez votre inscription — Brussels Governance Monitor',
        react: ConfirmEmail({ locale, confirmUrl }),
        tags: [
          { name: 'type', value: 'confirm' },
          { name: 'locale', value: locale },
        ],
      }),
    );

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, requiresConfirmation: true });
  } catch (err) {
    console.error('Subscribe: unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
