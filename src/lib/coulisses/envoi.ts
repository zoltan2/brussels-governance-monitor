// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Les coulisses de BGM » : lecture stricte des contacts, essai, simulation et
 * envoi réel d'un rendez-vous (bienvenue pour les nouveaux, édition du mois
 * pour les autres ; journal.ts).
 *
 * Envoi groupé comme le digest (`batch.send`, 100 par appel) : 130 abonnés
 * tiennent en deux appels, bien sous le délai de 100 s de Cloudflare.
 * Chaque destinataire est réservé au journal AVANT l'appel (voir journal.ts).
 */
import type { DatabaseSync } from 'node:sqlite';
import { getResend, resendCall } from '@/lib/resend';
import { generateUnsubscribeToken } from '@/lib/token';
import CoulissesEmail from '@/emails/coulisses';
import { fingerprintEmail } from '@/lib/desabonnements';
import { etatCampagne } from '@/lib/sondage/campagne';
import { assemblerBienvenue } from './corps';
import { estJourDEnvoi } from './calendrier';
import { choisirDestinataires, lireExclus, type ContactBrut, type Destinataire, type LangueEnvoi, type Selection, type Variante } from './selection';
import * as J from './journal';

/** Expéditeur au nom de Zoltán (décision du 3 novembre 2026) ; guillemets
 *  obligatoires à cause de la virgule (RFC 5322). */
export const COULISSES_FROM = '"Zoltán Jánosi, Brussels Governance Monitor" <contact@mail.brusselsgovernance.be>';
export const COULISSES_REPLY_TO = 'contact@brusselsgovernance.be';
const TAILLE_LOT = 100;

/** Une adresse dans un message d'erreur de Resend ne va jamais au rapport. */
export function masquerAdresses(texte: string): string {
  return texte.replace(/[^\s<>"'(),;:]+@[^\s<>"'(),;:]+/g, '[adresse]');
}

type ReponseResend = { data: unknown; error: { statusCode?: number | null; name?: string; message?: string } | null };

/** Un 4xx, hors 429 (déjà rejoué par resendCall), prouve que rien n'est parti. */
function estRefus(error: ReponseResend['error']): boolean {
  return typeof error?.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429;
}

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
    if (page.data.length === 0 && page.has_more) {
      throw new Error('Page vide annoncée non finale par Resend : envoi arrêté.');
    }

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

/** Tout ce qui part à un rendez-vous, et l'empreinte qu'un essai doit porter. */
export interface Contenu {
  numero: J.Numero;
  bienvenue: J.Bienvenue | null;
  sondageOuvert: boolean;
  empreinte: string;
}

/** Le sondage est-il ouvert au moment de PRÉPARER le mail (pas à l'inscription) ? */
export function sondageOuvert(maintenant = Date.now()): boolean {
  return etatCampagne(new Date(maintenant)) === 'ouverte';
}

export function contenuDuRendezVous(db: DatabaseSync, numero: number, maintenant = Date.now()): Contenu | null {
  const n = J.lireNumero(db, numero);
  if (!n) return null;
  const bienvenue = J.lireBienvenue(db);
  const ouvert = sondageOuvert(maintenant);
  return { numero: n, bienvenue, sondageOuvert: ouvert, empreinte: J.empreinteEnvoi({ edition: n.textes, bienvenue, sondageOuvert: ouvert }) };
}

/** Raison pour laquelle ce contenu ne peut pas partir, ou null. */
export function contenuIncomplet(c: Contenu): string | null {
  if (!c.bienvenue || !J.textesComplets(c.bienvenue.textes)) return 'Bienvenue incomplète : fr, nl et en, objet et texte.';
  if (!J.editionValide(c.numero.textes)) return 'Édition incomplète : remplir les trois langues, ou les laisser toutes vides.';
  return null;
}

export function construireMail(
  d: { email: string; langue: LangueEnvoi; variante: Variante; localeAbonne?: string },
  contenu: Pick<Contenu, 'bienvenue' | 'sondageOuvert'> & { edition: Partial<J.Textes> },
  numero: number,
  siteUrl: string,
  options: { essai?: boolean; destinataire?: string } = {},
) {
  const t =
    d.variante === 'premier'
      ? (() => {
          const b = contenu.bienvenue?.textes[d.langue];
          if (!b) throw new Error('Bienvenue absente');
          return { ...b, corps: assemblerBienvenue(b.corps, b.sondage, contenu.sondageOuvert) };
        })()
      : contenu.edition[d.langue];
  if (!t) throw new Error(`Édition absente (${d.langue})`);
  const { preferencesUrl, oneClick } = urls(siteUrl, d.email, d.langue);
  const germanophone = d.localeAbonne === 'de';
  const props = { langue: d.langue, variante: d.variante, corps: t.corps, apercu: t.apercu, germanophone, preferencesUrl };
  const genre = d.variante === 'premier' ? 'bienvenue' : 'edition';
  return {
    from: COULISSES_FROM,
    to: options.destinataire ?? d.email,
    replyTo: COULISSES_REPLY_TO,
    subject: options.essai ? `[Essai ${genre} ${germanophone ? 'de→en' : d.langue}] ${t.objet}` : t.objet,
    // Pas de `text` : Resend tire la version texte du HTML rendu.
    react: CoulissesEmail(props),
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
 * Essai : la bienvenue, et l'édition s'il y en a une, dans chaque langue et
 * dans l'anglais des germanophones, à l'adresse d'administration SEULEMENT.
 * Ne lit pas la liste des abonnés.
 */
export async function envoyerEssai(
  db: DatabaseSync,
  numero: number,
  destinataire: string,
  siteUrl: string,
  maintenant = Date.now(),
): Promise<{ envoyes: number; erreurs: string[] }> {
  const c = contenuDuRendezVous(db, numero, maintenant);
  if (!c) throw new Error('Rendez-vous inconnu.');
  if (c.numero.etat !== 'brouillon' && c.numero.etat !== 'interrompu') throw new Error('Rendez-vous déjà envoyé ou en cours.');
  const raison = contenuIncomplet(c);
  if (raison) throw new Error(raison);
  const variantes: Variante[] = J.editionVide(c.numero.textes) ? ['premier'] : ['premier', 'courant'];
  const cibles = [
    { langue: 'fr' as const, localeAbonne: 'fr' },
    { langue: 'nl' as const, localeAbonne: 'nl' },
    { langue: 'en' as const, localeAbonne: 'en' },
    { langue: 'en' as const, localeAbonne: 'de' },
  ];
  const contenu = { bienvenue: c.bienvenue, sondageOuvert: c.sondageOuvert, edition: c.numero.textes };
  const mails = variantes.flatMap((variante) =>
    cibles.map(({ langue, localeAbonne }) =>
      construireMail({ email: destinataire, langue, variante, localeAbonne }, contenu, numero, siteUrl, { essai: true, destinataire }),
    ),
  );
  const { error } = await resendCall(() => getResend().batch.send(mails));
  if (error) return { envoyes: 0, erreurs: [String(error.message ?? error.name ?? 'erreur Resend')] };
  J.noterEssai(db, numero, c.empreinte);
  return { envoyes: mails.length, erreurs: [] };
}

/**
 * Empreinte d'adresse de chaque contact lu, désabonnés COMPRIS (jamais l'adresse
 * au journal) : un désabonné encore dans Resend voit ses lignes complétées avant
 * la suppression de son contact, et sera reconnu s'il revient.
 */
function avecEmpreintes(contacts: ContactBrut[]): ContactBrut[] {
  return contacts.map((c) => ({ ...c, empreinte: fingerprintEmail(c.email) }));
}

export interface Simulation {
  numero: number;
  bienvenues: Record<string, number>;
  editions: Record<string, number>;
  /** Abonnés qui recevraient l'édition, mais il n'y en a pas ce mois-ci. */
  sansEdition: number;
  exclus: Selection['exclus'];
}

function compteParLangue(ds: Destinataire[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const d of ds) {
    const cle = d.localeAbonne === 'de' ? 'de→en' : d.langue;
    r[cle] = (r[cle] ?? 0) + 1;
  }
  return r;
}

/**
 * Qui recevrait quoi si l'on envoyait maintenant : effectifs seulement, aucune
 * adresse, aucune écriture (ni journal, ni Resend).
 */
export async function simuler(db: DatabaseSync, numero: number, maintenant = Date.now()): Promise<Simulation> {
  const c = contenuDuRendezVous(db, numero, maintenant);
  if (!c) throw new Error('Rendez-vous inconnu.');
  const exclusEnv = lireExclus(process.env.COULISSES_EXCLUS);
  if (!exclusEnv) throw new Error('COULISSES_EXCLUS absente sur le serveur.');
  const contacts = avecEmpreintes(await lireContactsStricts());
  const sel = choisirDestinataires(contacts, {
    maintenant,
    exclus: exclusEnv,
    bienvenueRecue: J.bienvenueRecue(db, numero),
    dejaAuJournal: J.dejaAuJournal(db, numero),
  });
  const premiers = sel.destinataires.filter((d) => d.variante === 'premier');
  const courants = sel.destinataires.filter((d) => d.variante === 'courant');
  const sansEdition = J.editionVide(c.numero.textes);
  return {
    numero,
    bienvenues: compteParLangue(premiers),
    editions: sansEdition ? {} : compteParLangue(courants),
    sansEdition: sansEdition ? courants.length : 0,
    exclus: sel.exclus,
  };
}

export interface Rapport {
  numero: number;
  mois: string | null;
  versionBienvenue: number | null;
  sondageOuvert: boolean;
  debut: string;
  fin: string;
  envoyes: Record<string, number>;
  exclus: Selection['exclus'];
  /** Abonnés déjà accueillis, sans édition ce mois-ci : rien ne leur part. */
  sansEdition: number;
  refusesParResend: number;
  incertains: number;
  /** Lignes de journal de plus de 24 mois effacées (personnes parties). */
  purges: number;
  /** À lire, sans effet sur l'état : lot refusé puis renvoyé un par un, adresse refusée. */
  avertissements: string[];
  /** Une erreur laisse le rendez-vous « interrompu » (reprise possible). */
  erreurs: string[];
}

function compteParLangueVariante(ds: Destinataire[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const d of ds) r[`${d.langue}-${d.variante}`] = (r[`${d.langue}-${d.variante}`] ?? 0) + 1;
  return r;
}

/**
 * Envoi réel. Le verrou doit avoir été pris (J.prendreVerrou) par l'appelant.
 * Revérifie, avant le premier mail : le jour (premier jeudi du mois du
 * rendez-vous) et l'empreinte (le contenu n'a pas changé depuis l'essai, ni
 * la bienvenue, ni l'état du sondage).
 */
export async function envoyerNumero(
  db: DatabaseSync,
  numero: number,
  siteUrl: string,
  maintenant = Date.now(),
): Promise<Rapport> {
  const debut = new Date().toISOString();
  // Clé d'idempotence propre à CE lancement : une reprise (contenu, jetons ou
  // lots différents) ne réutilise jamais la clé d'un lancement précédent.
  const lancement = Date.now().toString(36);
  const c = contenuDuRendezVous(db, numero, maintenant);
  if (!c || c.numero.etat !== 'envoi') throw new Error('Numéro non verrouillé pour l’envoi.');
  const exclusEnv = lireExclus(process.env.COULISSES_EXCLUS);
  const erreurs: string[] = [];
  const avertissements: string[] = [];
  const envoyes: Destinataire[] = [];
  let refusesParResend = 0;
  let incertains = 0;
  let sansEdition = 0;
  let purges = 0;
  let selection: Selection = { destinataires: [], exclus: { desinscrit: 0, refus: 0, langue: 0, date: 0, recent: 0, interne: 0, deja_envoye: 0 } };

  try {
    if (!exclusEnv) throw new Error('COULISSES_EXCLUS absente sur le serveur : envoi refusé.');
    if (!c.numero.mois || !estJourDEnvoi(c.numero.mois, new Date(maintenant))) {
      throw new Error('Envoi refusé : ce n’est pas le premier jeudi du mois de ce rendez-vous (heure de Bruxelles).');
    }
    if (c.numero.essaiEmpreinte !== c.empreinte) {
      throw new Error('Envoi refusé : le contenu a changé depuis l’essai (bienvenue, édition ou sondage). Refaire l’essai.');
    }
    const raison = contenuIncomplet(c);
    if (raison) throw new Error(raison);

    const contacts = avecEmpreintes(await lireContactsStricts());
    J.completerEmpreintes(db, contacts);
    const actifs = contacts.filter((x) => !x.unsubscribed);
    try {
      purges = J.purgerJournal(
        db,
        { ids: new Set(actifs.map((x) => x.id)), empreintes: new Set(actifs.flatMap((x) => (x.empreinte ? [x.empreinte] : []))) },
        maintenant,
      );
    } catch (e) {
      erreurs.push(masquerAdresses(`Purge du journal : ${e instanceof Error ? e.message : String(e)}`));
    }

    selection = choisirDestinataires(contacts, {
      maintenant,
      exclus: exclusEnv,
      bienvenueRecue: J.bienvenueRecue(db, numero),
      dejaAuJournal: J.dejaAuJournal(db, numero),
    });
    const editionVide = J.editionVide(c.numero.textes);
    const aEnvoyer = editionVide ? selection.destinataires.filter((d) => d.variante === 'premier') : selection.destinataires;
    sansEdition = selection.destinataires.length - aEnvoyer.length;
    const contenu = { bienvenue: c.bienvenue, sondageOuvert: c.sondageOuvert, edition: c.numero.textes };
    const version = c.bienvenue?.version ?? null;

    const resend = getResend();
    for (let i = 0; i < aEnvoyer.length; i += TAILLE_LOT) {
      const lot = aEnvoyer.slice(i, i + TAILLE_LOT).filter((d) => J.reserver(db, numero, d, version));
      if (lot.length === 0) continue;
      const envoyerLot = async (ds: Destinataire[], cle: string): Promise<ReponseResend> => {
        try {
          const mails = ds.map((d) => construireMail(d, contenu, numero, siteUrl));
          return await resendCall(() => resend.batch.send(mails, { idempotencyKey: cle }));
        } catch (e) {
          // Exception (rendu, réseau) : issue inconnue, comme une réponse perdue.
          return { data: null, error: { statusCode: null, name: 'exception', message: e instanceof Error ? e.message : String(e) } };
        }
      };
      const accepter = (ds: Destinataire[], data: unknown) => {
        const ids = (data as { data?: Array<{ id?: string }> } | null)?.data ?? [];
        ds.forEach((d, k) => {
          J.marquerEnvoye(db, numero, d.id, ids[k]?.id ?? null);
          envoyes.push(d);
        });
      };
      const texte = (quoi: string, error: NonNullable<ReponseResend['error']>) =>
        masquerAdresses(`${quoi} : ${String(error.name ?? '')} ${String(error.message ?? '')}`.trim());
      const noterErreur = (quoi: string, error: NonNullable<ReponseResend['error']>) => erreurs.push(texte(quoi, error));
      // Un refus d'adresse est définitif : une reprise n'y changerait rien.
      const noterAvertissement = (quoi: string, error: NonNullable<ReponseResend['error']>) => avertissements.push(texte(quoi, error));

      const r = await envoyerLot(lot, `coulisses-${numero}-${lancement}-${lot[0].id}`);
      if (!r.error) {
        accepter(lot, r.data);
      } else if (estRefus(r.error)) {
        // Validation stricte : UNE adresse refusée fait refuser le lot entier,
        // et rien n'est parti. On renvoie alors un par un, pour que seules
        // les adresses fautives restent sur le carreau.
        noterAvertissement(`Lot ${i / TAILLE_LOT + 1} refusé, envoi un par un`, r.error);
        for (const d of lot) {
          const u = await envoyerLot([d], `coulisses-${numero}-${lancement}-u-${d.id}`);
          if (!u.error) accepter([d], u.data);
          else if (estRefus(u.error)) {
            J.annulerReservation(db, numero, d.id);
            refusesParResend++;
            noterAvertissement('Refusé par Resend', u.error);
          } else {
            J.marquerIncertain(db, numero, d.id);
            incertains++;
            noterErreur('Issue inconnue', u.error);
          }
        }
      } else {
        // 5xx, délai dépassé, exception : peut suivre une acceptation. Issue
        // inconnue, jamais renvoyée automatiquement.
        for (const d of lot) J.marquerIncertain(db, numero, d.id);
        incertains += lot.length;
        noterErreur(`Lot ${i / TAILLE_LOT + 1}`, r.error);
      }
      J.battement(db, numero);
    }
  } catch (e) {
    erreurs.push(masquerAdresses(e instanceof Error ? e.message : String(e)));
  }

  const rapport: Rapport = {
    numero,
    mois: c.numero.mois,
    versionBienvenue: c.bienvenue?.version ?? null,
    sondageOuvert: c.sondageOuvert,
    debut,
    fin: new Date().toISOString(),
    envoyes: compteParLangueVariante(envoyes),
    exclus: selection.exclus,
    sansEdition,
    refusesParResend,
    incertains,
    purges,
    avertissements,
    erreurs,
  };
  J.terminer(db, numero, erreurs.length === 0 ? 'envoye' : 'interrompu', rapport);
  return rapport;
}
