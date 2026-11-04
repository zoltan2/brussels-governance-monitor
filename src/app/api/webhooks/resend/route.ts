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
 * - alerte l'adresse d'alertes privée (adresseAlertes) une seule fois par
 *   événement, et seulement quand une décision humaine est utile (voir
 *   `decision`, 4 novembre 2026).
 *
 * Elle ne désinscrit personne : Resend place lui-même les adresses en rebond
 * définitif ou en plainte dans sa liste de suppression, et la décision de
 * retirer un abonné reste humaine.
 *
 * Jusqu'au 4 novembre 2026, chaque rebond partait en email, y compris un rebond
 * temporaire (boîte pleine, serveur qui temporise, que Resend retente seul), et
 * le texte affirmait à tort que Resend suspendait l'adresse. Le premier reçu
 * venait du mail quotidien du Stuut, qui partage le domaine d'envoi sans poser
 * de tag : d'où « Envoi : inconnu ». L'envoi se déduit désormais aussi de
 * l'expéditeur.
 */
import { NextResponse } from 'next/server';
import { getResend, EMAIL_FROM, resendCall } from '@/lib/resend';
import { getDb } from '@/lib/db';
import { fingerprintEmail } from '@/lib/desabonnements';
import { pseudonymeEmail } from '@/lib/log-safe';
import { adresseAlertes } from '@/lib/adresse-alertes';

const TAILLE_MAX = 64 * 1024;
const TYPES_SUIVIS = new Set(['email.bounced', 'email.complained']);

/** Rebonds temporaires d'une même adresse sur cette fenêtre avant d'alerter. */
const SEUIL_TEMPORAIRES = 3;
const FENETRE_TEMPORAIRES_MS = 30 * 24 * 3600 * 1000;

interface EvenementResend {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    subject?: string;
    tags?: Tags;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

type Tags = Record<string, string> | Array<{ name?: string; value?: string }> | undefined;

/** Le tag `type` posé à l'envoi (digest, coulisses…), quelle que soit sa forme ;
 *  à défaut, la partie locale de l'expéditeur (« stuut » pour
 *  stuut@mail.brusselsgovernance.be, envoyé par un autre projet sans tag).
 *  Non exporté : un fichier route.ts n'exporte que ses méthodes HTTP. */
function typeDEnvoi(tags: Tags, from: string | undefined): string {
  const tag = Array.isArray(tags) ? tags.find((t) => t?.name === 'type')?.value : tags?.type;
  if (tag) return tag;
  const local = /<?([A-Za-z0-9._+-]+)@[^>\s]+>?\s*$/.exec(from ?? '')?.[1];
  return local ? `${local} (expéditeur, sans tag)` : 'inconnu';
}

type Decision =
  | { alerter: false }
  | { alerter: true; sujet: string; consigne: string };

/**
 * Faut-il un email ? Une plainte ou un rebond définitif : oui, tout de suite,
 * l'adresse est perdue et la réputation du domaine en jeu. Un rebond temporaire
 * ou indéterminé : non, Resend retente seul ; on alerte une seule fois, quand
 * la même adresse atteint SEUIL_TEMPORAIRES rebonds de ce genre en 30 jours.
 */
function decision(type: string, rebond: string | undefined, temporairesRecents: number): Decision {
  if (type === 'email.complained') {
    return {
      alerter: true,
      sujet: 'Plainte pour spam',
      consigne:
        "Resend place l'adresse dans sa liste de suppression : plus aucun envoi ne lui parviendra. Décider à la main s'il faut retirer l'abonné.",
    };
  }
  if (rebond === 'Permanent') {
    return {
      alerter: true,
      sujet: 'Rebond définitif',
      consigne:
        "Adresse inexistante ou refusée. Resend la place dans sa liste de suppression. Décider à la main s'il faut retirer l'abonné.",
    };
  }
  if (temporairesRecents === SEUIL_TEMPORAIRES) {
    return {
      alerter: true,
      sujet: `${SEUIL_TEMPORAIRES} rebonds temporaires en 30 jours`,
      consigne: `Rebonds temporaires répétés (boîte pleine, serveur qui refuse pour l'instant). Resend continue d'envoyer : rien n'est suspendu. Aucune nouvelle alerte pour cette adresse tant qu'elle reste à ${SEUIL_TEMPORAIRES} ou plus sur 30 jours.`,
    };
  }
  return { alerter: false };
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
  const envoi = typeDEnvoi(evenement.data?.tags, evenement.data?.from);
  const rebond = type === 'email.bounced' ? evenement.data?.bounce?.type || undefined : undefined;
  const empreinte = adresse ? fingerprintEmail(adresse) : null;

  // Sans base, impossible de compter : on n'alerte que sur plainte ou rebond
  // définitif (0 ne vaut jamais le seuil).
  let temporairesRecents = 0;
  const db = getDb();
  if (db) {
    const res = db
      .prepare(
        'INSERT OR IGNORE INTO resend_evenements (event_id, type, empreinte, envoi, recu_le, rebond) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, type, empreinte, envoi, Date.now(), rebond ?? null);
    // Événement déjà reçu (Resend redélivre en cas de doute) : pas de seconde alerte.
    if (res.changes === 0) return NextResponse.json({ duplicate: true });
    if (type === 'email.bounced' && rebond !== 'Permanent' && empreinte) {
      const ligne = db
        .prepare(
          `SELECT COUNT(*) AS n FROM resend_evenements
           WHERE empreinte = ? AND type = 'email.bounced'
             AND (rebond IS NULL OR rebond <> 'Permanent') AND recu_le >= ?`,
        )
        .get(empreinte, Date.now() - FENETRE_TEMPORAIRES_MS) as { n: number };
      temporairesRecents = ligne.n;
    }
  }

  const choix = decision(type, rebond, temporairesRecents);
  const alerte = adresseAlertes();
  if (alerte && choix.alerter) {
    const detail = evenement.data?.bounce
      ? `Type de rebond : ${evenement.data.bounce.type || '?'} / ${evenement.data.bounce.subType || '?'}`
      : '';
    await resendCall(() =>
      getResend().emails.send({
        from: EMAIL_FROM,
        to: alerte,
        subject: `[BGM] ${choix.sujet} sur un envoi « ${envoi} »`,
        text: [
          `${choix.sujet}, signalé par Resend.`,
          `Envoi : ${envoi}`,
          `Destinataire : ${pseudonymeEmail(adresse)} (pseudonyme ; l'adresse est dans Resend, mail ${evenement.data?.email_id || '?'})`,
          detail,
          `Reçu le : ${evenement.created_at || new Date().toISOString()}`,
          '',
          choix.consigne,
        ]
          .filter(Boolean)
          .join('\n'),
        tags: [{ name: 'type', value: 'alerte-webhook' }],
      }),
    );
  }

  return NextResponse.json({ received: true });
}
