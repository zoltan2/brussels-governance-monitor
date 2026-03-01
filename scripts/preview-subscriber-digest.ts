/**
 * Preview the exact digest email a specific subscriber would receive.
 *
 * Usage:
 *   npx tsx scripts/preview-subscriber-digest.ts <email>
 *
 * - Fetches the subscriber's locale + topics from Resend
 * - Collects real updated content from the site (using pending-digest cutoff)
 * - Filters by subscriber's topics
 * - Renders the email HTML and writes it to /tmp/digest-preview.html
 * - Optionally sends it with --send flag
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Resend } from 'resend';
import { render } from '@react-email/render';
import { writeFileSync } from 'fs';
import DigestEmail, { generateDigestPlainText } from '../src/emails/digest';
import { collectDigestUpdates, filterUpdatesForSubscriber, generateSummaryLine } from '../src/lib/digest-updates';

const email = process.argv[2];
const shouldSend = process.argv.includes('--send');

if (!email) {
  console.error('Usage: npx tsx scripts/preview-subscriber-digest.ts <email> [--send]');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('Error: RESEND_API_KEY not found.');
  process.exit(1);
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

async function main() {
  const resend = new Resend(apiKey);

  // 1. Fetch contact
  console.log(`Looking up ${email}...`);
  const { data: contacts } = await resend.contacts.list({ limit: 100 });
  if (!contacts) { console.error('Could not list contacts'); process.exit(1); }

  const contact = contacts.data.find(c => c.email === email && !c.unsubscribed);
  if (!contact) { console.error(`Contact ${email} not found or unsubscribed`); process.exit(1); }

  const { data: detail } = await resend.contacts.get({ id: contact.id });
  if (!detail) { console.error('Could not get contact details'); process.exit(1); }

  const props = detail.properties || {};
  const locale = (props.locale && typeof props.locale === 'object' && 'value' in props.locale)
    ? String(props.locale.value) : 'fr';
  const topicsStr = (props.topics && typeof props.topics === 'object' && 'value' in props.topics)
    ? String(props.topics.value) : '';
  const subscriberTopics = topicsStr ? topicsStr.split(',') : [];

  console.log(`Locale: ${locale}`);
  console.log(`Topics: ${subscriberTopics.join(', ') || '(all)'}`);

  // 2. Calculate cutoff — same as prepare-digest (ISO week Monday)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - ((dayOfWeek + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const cutoff = monday.toISOString().split('T')[0];
  console.log(`Cutoff: ${cutoff}`);

  // 3. Collect all updates
  const { byLocale, counts } = collectDigestUpdates(cutoff, siteUrl, 'preview');
  const allUpdates = byLocale[locale] || [];
  console.log(`Total updates (${locale}): ${allUpdates.length}`);

  // 4. Filter for this subscriber
  const updates = filterUpdatesForSubscriber(allUpdates, subscriberTopics);
  console.log(`Filtered updates: ${updates.length}`);

  if (updates.length === 0) {
    console.log('This subscriber would NOT receive an email (no matching updates).');
    return;
  }

  // Group summary
  const sections = { domains: 0, dossiers: 0, sectors: 0, communes: 0 };
  for (const u of updates) sections[u.section]++;
  console.log(`Breakdown: ${Object.entries(sections).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ')}`);

  // 5. Build email props
  const weekOf = new Date().toLocaleDateString(
    locale === 'nl' ? 'nl-BE' : locale === 'de' ? 'de-DE' : locale === 'en' ? 'en-GB' : 'fr-BE',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  const emailProps = {
    locale,
    updates,
    weekOf,
    unsubscribeUrl: `${siteUrl}/${locale}/subscribe/preferences?token=preview`,
    summaryLine: generateSummaryLine(counts, locale),
    weeklyNumber: { value: '75', label: 'Test weekly number', source: 'Test source' },
    closingNote: locale === 'nl' ? 'Een goede week gewenst.' : 'Bonne semaine à tous.',
    commitmentCount: 16,
    siteUrl,
    feedbackYesUrl: `${siteUrl}/digest/feedback?week=test&vote=yes`,
    feedbackNoUrl: `${siteUrl}/digest/feedback?week=test&vote=no`,
  };

  // 6. Render to HTML
  const html = await render(DigestEmail(emailProps));
  const outPath = '/tmp/digest-preview.html';
  writeFileSync(outPath, html);
  console.log(`\nHTML preview written to: ${outPath}`);
  console.log(`Open it: open ${outPath}`);

  // 7. Optionally send
  if (shouldSend) {
    console.log(`\nSending to ${email}...`);
    const { data, error } = await resend.emails.send({
      from: 'Brussels Governance Monitor <noreply@mail.brusselsgovernance.be>',
      to: email,
      subject: `[PREVIEW] Digest — ${weekOf}`,
      react: DigestEmail(emailProps),
      text: generateDigestPlainText(emailProps),
      tags: [{ name: 'type', value: 'digest-preview-subscriber' }],
    });
    if (error) { console.error('Send failed:', error); process.exit(1); }
    console.log(`Sent! ID: ${data?.id}`);
  }
}

main();
