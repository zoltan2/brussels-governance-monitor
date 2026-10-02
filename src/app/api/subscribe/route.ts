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
import { generateConfirmToken, generateUnsubscribeToken } from '@/lib/token';
import { rateLimit } from '@/lib/rate-limit';
import ConfirmEmail from '@/emails/confirm';
import DejaAbonneEmail from '@/emails/deja-abonne';
import { clientIp } from '@/lib/client-ip';
import { readJsonCapped } from '@/lib/request-guards';
import { pseudonymeEmail } from '@/lib/log-safe';

const LOCALES = ['fr', 'nl', 'en', 'de'] as const;
type LocaleEmail = (typeof LOCALES)[number];

// D'où vient l'inscription : liste fermée, recopiée dans la source du contact
// (`website-accueil`, `website-fiche-bas`...). Absente : `website`, comme avant.
const ORIGINES = ['accueil', 'page', 'fiche-haut', 'fiche-bas'] as const;

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(LOCALES),
  topics: z.array(z.string().min(1)).min(1),
  origine: z.enum(ORIGINES).optional(),
  website: z.string().max(0).optional(), // honeypot field — must be empty
});

const SUJETS_CONFIRMATION: Record<LocaleEmail, string> = {
  fr: 'Confirmez votre inscription — Brussels Governance Monitor',
  nl: 'Bevestig uw inschrijving — Brussels Governance Monitor',
  en: 'Confirm your subscription — Brussels Governance Monitor',
  de: 'Bestätigen Sie Ihre Anmeldung — Brussels Governance Monitor',
};

const SUJETS_DEJA_ABONNE: Record<LocaleEmail, string> = {
  fr: 'Vous êtes déjà abonné : ajouter ces sujets ?',
  nl: 'U bent al geabonneerd: deze onderwerpen toevoegen?',
  en: 'You are already subscribed: add these topics?',
  de: 'Sie sind bereits abonniert: diese Themen hinzufügen?',
};

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

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

    // Lecture plafonnee : le `Content-Length` seul ne protegeait pas d'un envoi
    // en `chunked`, qui n'en porte pas (revue red team du 28/09).
    const lu = await readJsonCapped(request);
    if (!lu.ok) {
      return NextResponse.json({ error: lu.error }, { status: lu.status });
    }
    const parsed = subscribeSchema.safeParse(lu.value);

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
    const topics = [...new Set(parsed.data.topics)].filter((t) => themesConnus.has(t));
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const source = parsed.data.origine ? `website-${parsed.data.origine}` : 'website';
    const reponse = () => NextResponse.json({ success: true, requiresConfirmation: true });

    // Adresse deja abonnee : la route n'ECRIT toujours rien dans le contact et
    // repond exactement comme pour une adresse inconnue, mais elle lui ECRIT.
    //
    // Historique. Avant le 21/09, cette branche fusionnait sans jeton les themes
    // de l'appelant dans le contact, changeait sa langue et renvoyait la liste
    // de ses themes : enumeration des abonnes et de leurs centres d'interet.
    // L'audit du 21/09 l'a rendue muette. Trop : l'abonne lisait « Verifiez
    // votre boite mail » et rien ne partait, rien ne changeait (revue du 01/10).
    //
    // Depuis le 02/10 : un email « deja abonne », dans la langue DU CONTACT, dont
    // le bouton porte le jeton des sujets demandes. Le clic passe par
    // `/api/confirm`, qui fusionne. Sans clic, rien ne change. Un tiers obtient
    // au plus un email par adresse et par 24 heures, et n'apprend rien : la
    // reponse HTTP est la meme, echec d'envoi compris.
    const existing = await getContact(email);
    let envoi: { locale: LocaleEmail; subject: string; type: string; react: React.ReactElement };

    if (existing) {
      const { allowed: rappelAutorise } = rateLimit(pseudonymeEmail(email), {
        bucket: 'subscribe-existant',
        max: 1,
        windowMs: UN_JOUR_MS,
      });
      if (!rappelAutorise) return reponse();

      const langue = (LOCALES as readonly string[]).includes(existing.locale)
        ? (existing.locale as LocaleEmail)
        : locale;
      const token = generateConfirmToken({ email, locale: langue, topics, source });
      envoi = {
        locale: langue,
        subject: SUJETS_DEJA_ABONNE[langue],
        type: 'deja-abonne',
        react: DejaAbonneEmail({
          locale: langue,
          confirmUrl: `${siteUrl}/${langue}/subscribe/confirm?token=${encodeURIComponent(token)}`,
          preferencesUrl: `${siteUrl}/${langue}/subscribe/preferences?token=${encodeURIComponent(generateUnsubscribeToken(email))}`,
          topics,
        }),
      };
    } else {
      // Personne desinscrite qui revient : elle recoit l'email de confirmation,
      // comme une adresse inconnue (double opt-in : rien ne change sans son
      // clic), mais AU PLUS UN par adresse et par 24 heures.
      //
      // Avant le 29/09, cette branche ne lui ecrivait jamais : un tiers ne
      // pouvait pas relancer quelqu'un qui avait demande a ne plus recevoir de
      // messages, mais la personne elle-meme ne pouvait plus se reabonner tant
      // que son contact restait au carnet (desormais 30 jours, purge RGPD). Le
      // plafond garde la premiere protection : un tiers obtient au plus un
      // email par jour, sans effet sans clic. La reponse reste identique dans
      // tous les cas : elle ne revele pas qu'une adresse s'est desinscrite.
      if (await estDesinscrit(email)) {
        const { allowed: relanceAutorisee } = rateLimit(pseudonymeEmail(email), {
          bucket: 'subscribe-desinscrit',
          max: 1,
          windowMs: UN_JOUR_MS,
        });
        if (!relanceAutorisee) return reponse();
      }

      // New subscriber — send confirmation email
      const token = generateConfirmToken({ email, locale, topics, source });
      envoi = {
        locale,
        subject: SUJETS_CONFIRMATION[locale],
        type: 'confirm',
        react: ConfirmEmail({
          locale,
          confirmUrl: `${siteUrl}/${locale}/subscribe/confirm?token=${encodeURIComponent(token)}`,
        }),
      };
    }

    const resend = getResend();
    const { error: sendError } = await resendCall(() =>
      resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: envoi.subject,
        react: envoi.react,
        tags: [
          { name: 'type', value: envoi.type },
          { name: 'locale', value: envoi.locale },
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

    return reponse();
  } catch (err) {
    console.error('Subscribe: unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
