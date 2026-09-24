// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Resend } from 'resend';
import { getDossierCards } from '@/lib/content';
import {
  DOMAIN_TOPICS,
  SECTOR_TOPICS,
  COMMUNE_TOPICS,
  ENGAGEMENT_TOPICS,
} from '@/lib/subscription-topics';

export { DOMAIN_TOPICS, SECTOR_TOPICS, COMMUNE_TOPICS, ENGAGEMENT_TOPICS };

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not configured');
    _resend = new Resend(key);
  }
  return _resend;
}

export const EMAIL_FROM = 'Brussels Governance Monitor <noreply@mail.brusselsgovernance.be>';

/** Maps Velite dossier slugs to topic identifiers (only for slugs that differ). */
export const DOSSIER_SLUG_TO_TOPIC: Record<string, string> = {
  'seniors-a-bruxelles': 'dossier-seniors',
  'data-centers-ia-energie': 'dossier-data-centers',
  'faillites-a-bruxelles': 'dossier-faillites',
};

/**
 * Get all dossier topics dynamically from Velite.
 * Returns ['dossiers', 'dossier-slrb', 'dossier-lez', ...].
 * Uses getDossierCards() from content.ts (static import of all Velite content):
 * server only, never reachable from a `'use client'` module (see
 * src/components/client-bundle-boundary.test.ts).
 */
export function getDossierTopics(): string[] {
  const cards = getDossierCards('fr');
  const slugs = [
    ...new Set(
      cards.map((c) => DOSSIER_SLUG_TO_TOPIC[c.slug] || `dossier-${c.slug}`),
    ),
  ];
  return ['dossiers', ...slugs];
}

/**
 * Get all valid topics (static + dynamic dossiers).
 * Returns a fresh array each call to include any new dossiers from Velite.
 */
export function getTopics(): string[] {
  return [
    ...DOMAIN_TOPICS,
    ...SECTOR_TOPICS,
    ...COMMUNE_TOPICS,
    ...getDossierTopics(),
    ...ENGAGEMENT_TOPICS,
  ];
}

export type Topic = string;

/** Maps each sector slug to its parent domain for digest matching. */
export const SECTOR_TO_DOMAIN: Record<string, string> = {
  commerce: 'employment',
  construction: 'housing',
  culture: 'budget',
  digital: 'digital',
  education: 'education',
  environment: 'climate',
  'health-social': 'social',
  horeca: 'employment',
  'housing-sector': 'housing',
  nonprofit: 'social',
  transport: 'mobility',
};

// ---------------------------------------------------------------------------
// Rate-limit throttle + retry for Resend API (2 req/s limit)
// ---------------------------------------------------------------------------

let _lastCallMs = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = 600 - (now - _lastCallMs);
  if (wait > 0) await sleep(wait);
  _lastCallMs = Date.now();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isRateLimited(error: any): boolean {
  return error?.statusCode === 429 || error?.name === 'rate_limit_exceeded';
}

/**
 * Execute a Resend API call with throttling (600ms between calls)
 * and automatic retry with exponential backoff on 429.
 */
export async function resendCall<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: () => Promise<{ data: T | null; error: any }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: T | null; error: any }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle();
    const result = await fn();
    if (result.error && isRateLimited(result.error)) {
      const backoff = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
      console.warn(`Resend rate limited, retrying in ${backoff}ms (attempt ${attempt + 1}/3)`);
      await sleep(backoff);
      continue;
    }
    return result;
  }
  await throttle();
  return fn();
}

// ---------------------------------------------------------------------------
// Contact management
// ---------------------------------------------------------------------------

/**
 * Add a confirmed subscriber to Resend Contacts.
 * Stores locale and topics as custom properties.
 */
export async function addContact(
  email: string,
  locale: string,
  topics: string[],
  sources: string[] = [],
): Promise<void> {
  const resend = getResend();
  const sanitizedSources = dedupeSources(sources);
  const properties = {
    locale,
    topics: topics.join(','),
    sources: sanitizedSources.join(','),
  };
  const created = await resendCall(() =>
    resend.contacts.create({ email, properties }),
  );
  if (created.error) {
    throw new Error(
      `Resend contacts.create failed for ${email}: ${formatResendError(created.error)}`,
    );
  }
  if (!created.data) return;

  const updated = await resendCall(() =>
    resend.contacts.update({
      id: (created.data as { id: string }).id,
      properties,
    }),
  );
  if (updated.error) {
    throw new Error(
      `Resend contacts.update (post-create) failed for ${email}: ${formatResendError(updated.error)}`,
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatResendError(err: any): string {
  if (!err) return 'unknown';
  const name = err.name ?? 'error';
  const status = err.statusCode ? ` ${err.statusCode}` : '';
  const msg = err.message ?? JSON.stringify(err);
  return `[${name}${status}] ${msg}`;
}

function dedupeSources(sources: string[]): string[] {
  return [
    ...new Set(
      sources
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[a-z0-9_-]+$/.test(s)),
    ),
  ];
}

/**
 * Get a contact's preferences from Resend.
 */
/**
 * Retrouve un contact par son adresse, en parcourant TOUTES les pages.
 *
 * `getContact` lisait `contacts.list({ limit: 100 })` sans pagination : au-dela
 * du centieme contact, la detection devenait aleatoire pour tout le monde, et
 * les branches « deja abonne » de quatre routes cessaient de fonctionner de
 * facon fiable. Le motif de pagination existait deja dans ce fichier
 * (`countActiveContacts`, `listActiveContacts`) mais pas ici (audit 21/09).
 *
 * Rend `undefined` si la recherche a ECHOUE (panne, quota), `null` si l'adresse
 * est reellement absente. Un appelant ne doit pas confondre les deux : une
 * panne n'est pas une absence.
 */
async function trouverContact(
  email: string,
): Promise<{ id: string; unsubscribed: boolean } | null | undefined> {
  const resend = getResend();
  const cible = email.toLowerCase().trim();
  let cursor: string | undefined;

  for (;;) {
    const options: { limit: number; after?: string } = { limit: 100 };
    if (cursor) options.after = cursor;

    const { data, error } = await resendCall(() => resend.contacts.list(options));
    if (error || !data) return undefined;

    const trouve = data.data.find((c) => c.email?.toLowerCase().trim() === cible);
    if (trouve) return { id: trouve.id, unsubscribed: Boolean(trouve.unsubscribed) };

    if (!data.has_more || data.data.length === 0) return null;
    cursor = data.data[data.data.length - 1].id;
  }
}

/**
 * Vrai si l'adresse figure dans le carnet et s'est DESINSCRITE.
 *
 * `getContact` filtrait `!c.unsubscribed`, donc une personne desinscrite
 * revenait `null`, c'est-a-dire « inconnue » : `/api/subscribe` lui renvoyait
 * alors un nouvel email de confirmation. On reecrivait a quelqu'un qui avait
 * explicitement demande a ne plus recevoir de messages.
 *
 * Rend `false` si la recherche echoue : on ne bloque pas une inscription
 * legitime sur une panne de lecture.
 */
export async function estDesinscrit(email: string): Promise<boolean> {
  const contact = await trouverContact(email);
  return contact ? contact.unsubscribed : false;
}

export async function getContact(
  email: string,
): Promise<{ locale: string; topics: string[]; sources: string[] } | null> {
  const resend = getResend();
  const trouve = await trouverContact(email);
  if (!trouve || trouve.unsubscribed) return null;
  const contact = trouve;

  const { data: detail } = await resendCall(() =>
    resend.contacts.get({ id: contact.id }),
  );
  if (!detail) return null;

  const props = detail.properties || {};
  const locale =
    props.locale && typeof props.locale === 'object' && 'value' in props.locale
      ? String(props.locale.value)
      : 'fr';
  const topicsStr =
    props.topics && typeof props.topics === 'object' && 'value' in props.topics
      ? String(props.topics.value)
      : '';
  const sourcesStr =
    props.sources && typeof props.sources === 'object' && 'value' in props.sources
      ? String(props.sources.value)
      : '';

  return {
    locale,
    topics: topicsStr ? topicsStr.split(',') : [],
    sources: sourcesStr ? sourcesStr.split(',').filter(Boolean) : [],
  };
}

/**
 * Update a contact's preferences (locale, topics, and optionally sources).
 * Passing `sources` explicitly overwrites the current set; omit to preserve.
 */
export async function updateContactPreferences(
  email: string,
  locale: string,
  topics: string[],
  sources?: string[],
): Promise<void> {
  const resend = getResend();
  const properties: Record<string, string> = {
    locale,
    topics: topics.join(','),
  };
  if (sources !== undefined) {
    properties.sources = dedupeSources(sources).join(',');
  }
  const result = await resendCall(() =>
    resend.contacts.update({
      email,
      properties,
    }),
  );
  if (result.error) {
    throw new Error(
      `Resend contacts.update failed for ${email}: ${formatResendError(result.error)}`,
    );
  }
}

/**
 * Add a source tag to an existing contact's `sources` property without
 * clobbering their topics/locale. No-op if the contact doesn't exist.
 * Returns whether a new source was actually added (for callers that want to
 * know if something changed).
 */
export async function mergeContactSources(
  email: string,
  newSources: string[],
): Promise<boolean> {
  const existing = await getContact(email);
  if (!existing) return false;
  const merged = dedupeSources([...existing.sources, ...newSources]);
  if (merged.length === existing.sources.length) return false;
  await updateContactPreferences(email, existing.locale, existing.topics, merged);
  return true;
}

/**
 * Mark a contact as unsubscribed in Resend.
 */
export async function removeContact(email: string): Promise<void> {
  const resend = getResend();
  await resendCall(() =>
    resend.contacts.update({
      email,
      unsubscribed: true,
    }),
  );
}

export interface ActiveContact {
  id: string;
  email: string;
  locale: string;
  topics: string[];
  sources: string[];
}

/**
 * Count active (not unsubscribed) contacts, without fetching their
 * properties. Un appel par page de 100, là où listActiveContacts en fait un
 * de plus PAR CONTACT pour lire ses propriétés.
 *
 * L'écart n'est pas cosmétique : throttle() impose 600 ms entre deux appels
 * Resend, donc lister 91 abonnés actifs coûte 92 appels, soit 55 secondes.
 * C'est ce qui bloquait la tuile Abonnés de /admin sur son fallback.
 *
 * Rend null en cas d'erreur, pour que l'appelant distingue une panne d'un
 * carnet d'adresses réellement vide.
 */
export async function countActiveContacts(): Promise<number | null> {
  const resend = getResend();
  let count = 0;
  let cursor: string | undefined;

  for (;;) {
    const options: { limit: number; after?: string } = { limit: 100 };
    if (cursor) options.after = cursor;

    const { data, error } = await resendCall(() =>
      resend.contacts.list(options),
    );
    if (error || !data) return null;

    for (const contact of data.data) {
      if (!contact.unsubscribed) count++;
    }

    if (!data.has_more) break;
    cursor = data.data[data.data.length - 1].id;
  }

  return count;
}

/**
 * List all active (not unsubscribed) contacts with their properties.
 * Paginates through all contacts (cursor-based, max 100 per page).
 *
 * ⚠️ Un appel API par contact, espacés de 600 ms : compter des dizaines de
 * secondes. Réservé aux envois de digest, qui ont besoin de la locale et des
 * thèmes de chaque abonné. Pour un simple total, countActiveContacts().
 */
export async function listActiveContacts(): Promise<ActiveContact[]> {
  const resend = getResend();
  const contacts: ActiveContact[] = [];
  let cursor: string | undefined;

  for (;;) {
    const options: { limit: number; after?: string } = {
      limit: 100,
    };
    if (cursor) options.after = cursor;

    const { data, error } = await resendCall(() =>
      resend.contacts.list(options),
    );
    if (error || !data) break;

    for (const contact of data.data) {
      if (contact.unsubscribed) continue;

      const { data: detail } = await resendCall(() =>
        resend.contacts.get({ id: contact.id }),
      );
      if (!detail) continue;

      const props = detail.properties || {};
      const locale =
        (props.locale && typeof props.locale === 'object' && 'value' in props.locale
          ? String(props.locale.value)
          : 'fr');
      const topicsStr =
        (props.topics && typeof props.topics === 'object' && 'value' in props.topics
          ? String(props.topics.value)
          : '');
      const sourcesStr =
        (props.sources && typeof props.sources === 'object' && 'value' in props.sources
          ? String(props.sources.value)
          : '');

      contacts.push({
        id: contact.id,
        email: contact.email,
        locale,
        topics: topicsStr ? topicsStr.split(',') : [],
        sources: sourcesStr ? sourcesStr.split(',').filter(Boolean) : [],
      });
    }

    if (!data.has_more) break;
    cursor = data.data[data.data.length - 1].id;
  }

  return contacts;
}
