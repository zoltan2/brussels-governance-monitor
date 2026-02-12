import { Resend } from 'resend';

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

export const DOMAIN_TOPICS = [
  'budget',
  'mobility',
  'employment',
  'housing',
  'climate',
  'social',
  'solutions',
] as const;

export const SECTOR_TOPICS = [
  'commerce',
  'construction',
  'culture',
  'digital',
  'education',
  'environment',
  'health-social',
  'horeca',
  'housing-sector',
  'nonprofit',
  'transport',
] as const;

export const COMMUNE_TOPICS = ['communes'] as const;

export const TOPICS = [...DOMAIN_TOPICS, ...SECTOR_TOPICS, ...COMMUNE_TOPICS] as const;

export type Topic = (typeof TOPICS)[number];

/** Maps each sector slug to its parent domain for digest matching. */
export const SECTOR_TO_DOMAIN: Record<string, string> = {
  commerce: 'employment',
  construction: 'housing',
  culture: 'budget',
  digital: 'employment',
  education: 'social',
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
): Promise<void> {
  const resend = getResend();
  const result = await resendCall(() =>
    resend.contacts.create({
      email,
      properties: {
        locale,
        topics: topics.join(','),
      },
    }),
  );

  // Fallback: if properties were ignored by create, set via update
  if (result.data) {
    await resendCall(() =>
      resend.contacts.update({
        id: (result.data as { id: string }).id,
        properties: {
          locale,
          topics: topics.join(','),
        },
      }),
    );
  }
}

/**
 * Get a contact's preferences from Resend.
 */
export async function getContact(
  email: string,
): Promise<{ locale: string; topics: string[] } | null> {
  const resend = getResend();
  const { data: contacts } = await resendCall(() =>
    resend.contacts.list({ limit: 100 }),
  );
  if (!contacts) return null;

  const contact = contacts.data.find(
    (c) => c.email === email && !c.unsubscribed,
  );
  if (!contact) return null;

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

  return {
    locale,
    topics: topicsStr ? topicsStr.split(',') : [],
  };
}

/**
 * Update a contact's preferences (locale and topics) in Resend.
 */
export async function updateContactPreferences(
  email: string,
  locale: string,
  topics: string[],
): Promise<void> {
  const resend = getResend();
  await resendCall(() =>
    resend.contacts.update({
      email,
      properties: {
        locale,
        topics: topics.join(','),
      },
    }),
  );
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
}

/**
 * List all active (not unsubscribed) contacts with their properties.
 * Paginates through all contacts (cursor-based, max 100 per page).
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

      contacts.push({
        id: contact.id,
        email: contact.email,
        locale,
        topics: topicsStr ? topicsStr.split(',') : [],
      });
    }

    if (!data.has_more) break;
    cursor = data.data[data.data.length - 1].id;
  }

  return contacts;
}
