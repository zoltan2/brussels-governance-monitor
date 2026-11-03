// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Les coulisses de BGM » : lecture stricte des contacts, essai et envoi réel.
 *
 * Envoi groupé comme le digest (`batch.send`, 100 par appel) : 130 abonnés
 * tiennent en deux appels, bien sous le délai de 100 s de Cloudflare.
 * Chaque destinataire est réservé au journal AVANT l'appel (voir journal.ts).
 */
import type { DatabaseSync } from 'node:sqlite';
import { getResend, resendCall } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import CoulissesEmail, { texteBrutCoulisses } from '@/emails/coulisses';
import { choisirDestinataires, lireExclus, type ContactBrut, type Destinataire, type LangueEnvoi, type Selection, type Variante } from './selection';
import * as J from './journal';

/** Expéditeur au nom de Zoltán (décision du 3 novembre 2026) ; guillemets
 *  obligatoires à cause de la virgule (RFC 5322). */
export const COULISSES_FROM = '"Zoltán Jánosi, Brussels Governance Monitor" <contact@mail.brusselsgovernance.be>';
export const COULISSES_REPLY_TO = 'contact@brusselsgovernance.be';
const TAILLE_LOT = 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function valeur(props: any, cle: string): string {
  const p = props?.[cle];
  return p && typeof p === 'object' && 'value' in p ? String(p.value ?? '') : '';
}

/**
 * Tous les contacts, propriétés brutes. Échoue au lieu de tronquer : une page
 * ou une fiche illisible après trois essais arrête tout, avant le premier mail.
 */
export async function lireContactsStricts(): Promise<ContactBrut[]> {
  const resend = getResend();
  const contacts: ContactBrut[] = [];
  let cursor: string | undefined;
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (;;) {
    const options: { limit: number; after?: string } = { limit: 100 };
    if (cursor) options.after = cursor;
    let page = null;
    for (let i = 0; i < 3 && !page; i++) {
      const { data } = await resendCall(() => resend.contacts.list(options));
      if (data) page = data;
      else await pause(2000);
    }
    if (!page) throw new Error('Lecture de la liste Resend impossible : envoi arrêté.');

    for (const c of page.data) {
      if (c.unsubscribed) {
        contacts.push({ id: c.id, email: c.email, unsubscribed: true, createdAt: c.created_at, locale: '', motMensuel: '', sources: '' });
        continue;
      }
      let detail = null;
      for (let i = 0; i < 3 && !detail; i++) {
        const { data } = await resendCall(() => resend.contacts.get({ id: c.id }));
        if (data) detail = data;
        else await pause(2000);
      }
      if (!detail) throw new Error(`Fiche de contact illisible (${c.id.slice(0, 8)}) : envoi arrêté.`);
      contacts.push({
        id: c.id,
        email: c.email,
        unsubscribed: false,
        createdAt: c.created_at,
        locale: valeur(detail.properties, 'locale'),
        motMensuel: valeur(detail.properties, 'mot_mensuel'),
        sources: valeur(detail.properties, 'sources'),
      });
    }
    if (!page.has_more || page.data.length === 0) break;
    cursor = page.data[page.data.length - 1].id;
  }
  return contacts;
}

function urls(siteUrl: string, email: string, langue: LangueEnvoi) {
  const jeton = generateUnsubscribeToken(email);
  return {
    preferencesUrl: `${siteUrl}/${langue}/subscribe/preferences?token=${encodeURIComponent(jeton)}`,
    oneClick: `${siteUrl}/api/coulisses/one-click?token=${encodeURIComponent(jeton)}&locale=${langue}`,
  };
}

export function construireMail(
  d: { email: string; langue: LangueEnvoi; variante: Variante },
  textes: J.Textes,
  numero: number,
  siteUrl: string,
  options: { essai?: boolean; destinataire?: string } = {},
) {
  const t = textes[d.langue];
  const { preferencesUrl, oneClick } = urls(siteUrl, d.email, d.langue);
  const props = { langue: d.langue, variante: d.variante, corps: t.corps, preferencesUrl };
  return {
    from: COULISSES_FROM,
    to: options.destinataire ?? d.email,
    replyTo: COULISSES_REPLY_TO,
    subject: options.essai ? `[Essai ${d.langue} ${d.variante}] ${t.objet}` : t.objet,
    react: CoulissesEmail(props),
    text: texteBrutCoulisses(props),
    headers: {
      // Le bouton « se désabonner » du client mail refuse les coulisses seules,
      // jamais le digest (POST RFC 8058 sur /api/coulisses/one-click).
      'List-Unsubscribe': `<${oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    tags: [
      { name: 'type', value: options.essai ? 'coulisses-essai' : 'coulisses' },
      { name: 'numero', value: String(numero) },
      { name: 'variante', value: d.variante },
    ],
  };
}

/**
 * Essai : chaque variante qui partira, dans chaque langue, à l'adresse
 * d'administration SEULEMENT. Ne lit pas la liste des abonnés.
 */
export async function envoyerEssai(
  db: DatabaseSync,
  numero: number,
  destinataire: string,
  siteUrl: string,
): Promise<{ envoyes: number; erreurs: string[] }> {
  const n = J.lireNumero(db, numero);
  if (!n || !J.textesComplets(n.textes)) throw new Error('Textes incomplets : fr, nl et en, objet et corps.');
  const variantes: Variante[] = J.ontDejaRecu(db, numero).size > 0 ? ['premier', 'courant'] : ['premier'];
  const mails = (['fr', 'nl', 'en'] as const).flatMap((langue) =>
    variantes.map((variante) =>
      construireMail({ email: destinataire, langue, variante }, n.textes, numero, siteUrl, { essai: true, destinataire }),
    ),
  );
  const { error } = await resendCall(() => getResend().batch.send(mails));
  if (error) return { envoyes: 0, erreurs: [String(error.message ?? error.name ?? 'erreur Resend')] };
  J.noterEssai(db, numero, J.empreinteTextes(n.textes));
  return { envoyes: mails.length, erreurs: [] };
}

export interface Rapport {
  numero: number;
  debut: string;
  fin: string;
  envoyes: Record<string, number>;
  exclus: Selection['exclus'];
  refusesParResend: number;
  incertains: number;
  erreurs: string[];
}

function compteParLangueVariante(ds: Destinataire[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const d of ds) r[`${d.langue}-${d.variante}`] = (r[`${d.langue}-${d.variante}`] ?? 0) + 1;
  return r;
}

/** Envoi réel. Le verrou doit avoir été pris (J.prendreVerrou) par l'appelant. */
export async function envoyerNumero(
  db: DatabaseSync,
  numero: number,
  siteUrl: string,
  maintenant = Date.now(),
): Promise<Rapport> {
  const debut = new Date().toISOString();
  const n = J.lireNumero(db, numero);
  if (!n || n.etat !== 'envoi') throw new Error('Numéro non verrouillé pour l’envoi.');
  const exclusEnv = lireExclus(process.env.COULISSES_EXCLUS);
  const erreurs: string[] = [];
  const envoyes: Destinataire[] = [];
  let refusesParResend = 0;
  let incertains = 0;
  let selection: Selection = { destinataires: [], exclus: { desinscrit: 0, refus: 0, langue: 0, date: 0, recent: 0, interne: 0, deja_envoye: 0 } };

  try {
    if (!exclusEnv) throw new Error('COULISSES_EXCLUS absente sur le serveur : envoi refusé.');
    const contacts = await lireContactsStricts();
    selection = choisirDestinataires(contacts, {
      maintenant,
      exclus: exclusEnv,
      ontDejaRecu: J.ontDejaRecu(db, numero),
      dejaAuJournal: J.dejaAuJournal(db, numero),
    });

    const resend = getResend();
    for (let i = 0; i < selection.destinataires.length; i += TAILLE_LOT) {
      const lot = selection.destinataires.slice(i, i + TAILLE_LOT).filter((d) => J.reserver(db, numero, d));
      if (lot.length === 0) continue;
      const mails = lot.map((d) => construireMail(d, n.textes, numero, siteUrl));
      const { data, error } = await resendCall(() => resend.batch.send(mails));
      if (error) {
        // Code HTTP connu : Resend a refusé le lot entier (validation stricte),
        // rien n'est parti. Sans code : réponse perdue, issue inconnue.
        const refuse = typeof error.statusCode === 'number';
        for (const d of lot) {
          if (refuse) J.annulerReservation(db, numero, d.id);
          else J.marquerIncertain(db, numero, d.id);
        }
        if (refuse) refusesParResend += lot.length;
        else incertains += lot.length;
        erreurs.push(`Lot ${i / TAILLE_LOT + 1} : ${String(error.name ?? '')} ${String(error.message ?? '')}`.trim());
        continue;
      }
      const ids = (data as { data?: Array<{ id?: string }> } | null)?.data ?? [];
      lot.forEach((d, k) => {
        J.marquerEnvoye(db, numero, d.id, ids[k]?.id ?? null);
        envoyes.push(d);
      });
    }
  } catch (e) {
    erreurs.push(e instanceof Error ? e.message : String(e));
  }

  const rapport: Rapport = {
    numero,
    debut,
    fin: new Date().toISOString(),
    envoyes: compteParLangueVariante(envoyes),
    exclus: selection.exclus,
    refusesParResend,
    incertains,
    erreurs,
  };
  J.terminer(db, numero, erreurs.length === 0 ? 'envoye' : 'interrompu', rapport);
  return rapport;
}
