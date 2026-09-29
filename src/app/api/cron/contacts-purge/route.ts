// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isValidCronAuth } from '@/lib/cron-auth';
import { listUnsubscribedContacts, deleteContactById } from '@/lib/resend';
import {
  DELAI_SUPPRESSION_CONTACT_MS,
  JOUR_MS,
  fingerprintEmail,
  lireDesabonnement,
  noterDesabonnement,
  marquerContactSupprime,
  limiteConservationEmpreinte,
  compterDesabonnementsExpires,
  purgerDesabonnementsExpires,
} from '@/lib/desabonnements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Purge quotidienne des données promises à l'effacement par la politique de
 * confidentialité (décision du 29/09/2026). Appelée par le timer VPS
 * `bgm-cron-contacts-purge` (dépôt bgm-ops, deploy/cron), comme les autres
 * routes cron : `Authorization: Bearer CRON_SECRET`.
 *
 * 1. Contacts Resend désinscrits : chacun est rapproché du registre des
 *    désabonnements par son empreinte (src/lib/desabonnements.ts). Sans ligne,
 *    on en crée une datée d'aujourd'hui : les personnes désinscrites avant la
 *    mise en service n'ont pas de date connue, leur délai de 30 jours part
 *    donc de la première observation par cette route. Avec une ligne de
 *    30 jours ou plus, le contact est supprimé de Resend.
 * 2. Lignes du registre de plus de 24 mois : effacées.
 *
 * Les questions posées à l'assistant ne sont PAS purgées ici : décision de
 * Zoltán du 29/09/2026 de les garder (seul plafond : les 10 000 dernières,
 * src/lib/chat-logs.ts). La politique de confidentialité a été mise à jour
 * dans les quatre langues le même jour. Une première version (#634, #640)
 * effaçait leur texte à 90 jours.
 *
 * MODE À BLANC PAR DÉFAUT. Sans `CONTACTS_PURGE_ENABLED=1` dans
 * l'environnement du serveur, la route n'écrit ni ne supprime RIEN (pas même
 * les lignes de première observation) : elle compte et rend les comptes.
 * Aucune adresse, aucune empreinte n'est renvoyée ni journalisée.
 *
 * Code 500 si la liste Resend est incomplète ou si une suppression a échoué,
 * pour que l'alerte OnFailure du timer se déclenche.
 */
export async function GET(request: Request) {
  if (!isValidCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY missing' }, { status: 500 });
  }
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'AUTH_SECRET missing' }, { status: 500 });
  }

  // Sans base, aucune date de désabonnement n'est connue : supprimer serait
  // deviner. On refuse d'agir.
  const db = getDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'no sqlite backend' }, { status: 503 });
  }

  const actif = process.env.CONTACTS_PURGE_ENABLED === '1';
  const maintenant = Date.now();

  const liste = await listUnsubscribedContacts();
  if (!liste.complete) {
    console.error('[contacts-purge] liste Resend incomplète', liste.error);
  }

  let sansLigne = 0;
  let enAttente = 0;
  let aSupprimer = 0;
  let contactsSupprimes = 0;
  let erreursResend = 0;

  for (const contact of liste.contacts) {
    const empreinte = fingerprintEmail(contact.email);
    const ligne = lireDesabonnement(db, empreinte);

    if (!ligne) {
      sansLigne++;
      if (actif) noterDesabonnement(db, empreinte, maintenant);
      continue;
    }

    if (maintenant - ligne.desabonne_le < DELAI_SUPPRESSION_CONTACT_MS) {
      enAttente++;
      continue;
    }

    aSupprimer++;
    if (!actif) continue;

    const erreur = await deleteContactById(contact.id);
    if (erreur) {
      erreursResend++;
      console.error('[contacts-purge] suppression refusée par Resend', erreur);
      continue;
    }
    contactsSupprimes++;
    marquerContactSupprime(db, empreinte, maintenant);
  }

  const limiteEmpreintes = limiteConservationEmpreinte(maintenant);
  const lignesExpirees = actif
    ? purgerDesabonnementsExpires(db, limiteEmpreintes)
    : compterDesabonnementsExpires(db, limiteEmpreintes);

  const rapport = {
    mode: actif ? 'actif' : 'a-blanc',
    listeComplete: liste.complete,
    contactsDesinscrits: liste.contacts.length,
    sansLigne,
    enAttente,
    aSupprimer,
    contactsSupprimes,
    erreursResend,
    lignesExpirees,
  };
  console.log('[contacts-purge]', JSON.stringify(rapport));

  const ok = liste.complete && erreursResend === 0;
  return NextResponse.json({ ok, ...rapport }, { status: ok ? 200 : 500 });
}
