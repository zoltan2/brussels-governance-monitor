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

export const TOPICS = [...DOMAIN_TOPICS, ...SECTOR_TOPICS] as const;

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
  const result = await resend.contacts.create({
    email,
    properties: {
      locale,
      topics: topics.join(','),
    },
  });

  // Fallback: if properties were ignored by create, set via update
  if (result.data) {
    await new Promise((r) => setTimeout(r, 1000));
    await resend.contacts.update({
      id: result.data.id,
      properties: {
        locale,
        topics: topics.join(','),
      },
    });
  }
}

/**
 * Get a contact's preferences from Resend.
 */
export async function getContact(
  email: string,
): Promise<{ locale: string; topics: string[] } | null> {
  const resend = getResend();
  const { data: contacts } = await resend.contacts.list({ limit: 100 });
  if (!contacts) return null;

  const contact = contacts.data.find(
    (c) => c.email === email && !c.unsubscribed,
  );
  if (!contact) return null;

  const { data: detail } = await resend.contacts.get({ id: contact.id });
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
  await resend.contacts.update({
    email,
    properties: {
      locale,
      topics: topics.join(','),
    },
  });
}

/**
 * Mark a contact as unsubscribed in Resend.
 */
export async function removeContact(email: string): Promise<void> {
  const resend = getResend();
  await resend.contacts.update({
    email,
    unsubscribed: true,
  });
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

    const { data, error } = await resend.contacts.list(options);
    if (error || !data) break;

    for (const contact of data.data) {
      if (contact.unsubscribed) continue;

      // Rate limit: Resend allows 2 req/sec
      await new Promise((r) => setTimeout(r, 500));

      // Fetch individual contact to get properties
      const { data: detail } = await resend.contacts.get({
        id: contact.id,
      });
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
