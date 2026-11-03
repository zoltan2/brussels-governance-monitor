// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Webhook Resend : rebonds et plaintes pour spam (3 novembre 2026).
 *
 * Avant lui, aucun rebond ni signalement comme spam n'était visible : une
 * plainte sur un envoi passait inaperçue alors que le digest et « Les coulisses
 * de BGM » partagent le même domaine d'envoi. La route :
 *
 * - vérifie la signature (bibliothèque standardwebhooks via le SDK Resend,
 *   secret RESEND_WEBHOOK_SECRET posé sur le serveur) ;
 * - inscrit l'événement dans `resend_evenements` (empreinte, jamais l'adresse) ;
 * - envoie une alerte à l'adresse d'alertes privée (adresseAlertes), une seule
 *   fois par événement.
 *
 * Elle ne désinscrit personne : Resend place lui-même les adresses en rebond
 * définitif ou en plainte dans sa liste de suppression, et la décision de
 * retirer un abonné reste humaine.
 */
import { NextResponse } from 'next/server';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { getDb } from '@/lib/db';
import { fingerprintEmail } from '@/lib/desabonnements';
import { pseudonymeEmail } from '@/lib/log-safe';
import { adresseAlertes } from '@/lib/adresse-alertes';

const TAILLE_MAX = 64 * 1024;
const TYPES_SUIVIS = new Set(['email.bounced', 'email.complained']);

interface EvenementResend {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    subject?: string;
    tags?: Tags;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

type Tags = Record<string, string> | Array<{ name?: string; value?: string }> | undefined;

/** Le tag `type` posé à l'envoi (digest, coulisses…), quelle que soit sa forme.
 *  Non exporté : un fichier route.ts n'exporte que ses méthodes HTTP. */
function typeDEnvoi(tags: Tags): string {
  if (!tags) return 'inconnu';
  if (Array.isArray(tags)) return tags.find((t) => t?.name === 'type')?.value || 'inconnu';
  return tags.type || 'inconnu';
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Sans secret, aucune signature n'est vérifiable : refuser plutôt que croire.
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const longueur = Number(request.headers.get('content-length') || 0);
  if (longueur > TAILLE_MAX) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }
  const brut = await request.text();
  if (brut.length > TAILLE_MAX) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const id = request.headers.get('webhook-id') || request.headers.get('svix-id') || '';
  const timestamp =
    request.headers.get('webhook-timestamp') || request.headers.get('svix-timestamp') || '';
  const signature =
    request.headers.get('webhook-signature') || request.headers.get('svix-signature') || '';

  let evenement: EvenementResend;
  try {
    evenement = getResend().webhooks.verify({
      payload: brut,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    }) as EvenementResend;
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const type = evenement.type || '';
  if (!TYPES_SUIVIS.has(type)) {
    return NextResponse.json({ ignored: true });
  }

  const destinataires = evenement.data?.to;
  const adresse = Array.isArray(destinataires) ? destinataires[0] : destinataires;
  const envoi = typeDEnvoi(evenement.data?.tags);

  const db = getDb();
  if (db) {
    const res = db
      .prepare(
        'INSERT OR IGNORE INTO resend_evenements (event_id, type, empreinte, envoi, recu_le) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, type, adresse ? fingerprintEmail(adresse) : null, envoi, Date.now());
    // Événement déjà reçu (Resend redélivre en cas de doute) : pas de seconde alerte.
    if (res.changes === 0) return NextResponse.json({ duplicate: true });
  }

  const alerte = adresseAlertes();
  if (alerte) {
    const libelle = type === 'email.complained' ? 'Plainte pour spam' : 'Rebond';
    const detail = evenement.data?.bounce
      ? `Type de rebond : ${evenement.data.bounce.type || '?'} / ${evenement.data.bounce.subType || '?'}`
      : '';
    await resendCall(() =>
      getResend().emails.send({
        from: EMAIL_FROM,
        to: alerte,
        subject: `[BGM] ${libelle} sur un envoi « ${envoi} »`,
        text: [
          `${libelle} signalé par Resend.`,
          `Envoi : ${envoi}`,
          `Destinataire : ${pseudonymeEmail(adresse)} (pseudonyme ; l'adresse est dans Resend, mail ${evenement.data?.email_id || '?'})`,
          detail,
          `Reçu le : ${evenement.created_at || new Date().toISOString()}`,
          '',
          "Resend suspend lui-même les envois vers cette adresse. Décider à la main s'il faut retirer l'abonné.",
        ]
          .filter(Boolean)
          .join('\n'),
        tags: [{ name: 'type', value: 'alerte-webhook' }],
      }),
    );
  }

  return NextResponse.json({ received: true });
}
