/**
 * Test digest email — sends a sample digest to your inbox.
 *
 * Usage:
 *   npx tsx scripts/test-digest.ts <email> [locale]
 *
 * Examples:
 *   npx tsx scripts/test-digest.ts me@example.com
 *   npx tsx scripts/test-digest.ts me@example.com nl
 *
 * Requires: RESEND_API_KEY in .env.local
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { Resend } from 'resend';
import DigestEmail from '../src/emails/digest';

const EMAIL_FROM = 'Brussels Governance Monitor <noreply@mail.brusselsgovernance.be>';

const email = process.argv[2];
const locale = process.argv[3] || 'fr';

if (!email) {
  console.error('Usage: npx tsx scripts/test-digest.ts <email> [locale]');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('Error: RESEND_API_KEY not found. Make sure .env.local exists.');
  process.exit(1);
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://governance.brussels';

const weekOf = new Date().toLocaleDateString('fr-BE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const sampleUpdates = [
  {
    title: locale === 'fr' ? 'Budget régional' : locale === 'nl' ? 'Gewestelijke begroting' : locale === 'de' ? 'Regionalhaushalt' : 'Regional Budget',
    domain: 'budget',
    status: locale === 'fr' ? 'bloqué' : locale === 'nl' ? 'geblokkeerd' : locale === 'de' ? 'blockiert' : 'blocked',
    summary: locale === 'fr'
      ? 'Le budget régional reste en douzièmes provisoires depuis juin 2024.'
      : locale === 'nl'
        ? 'De gewestelijke begroting werkt sinds juni 2024 met voorlopige twaalfden.'
        : locale === 'de'
          ? 'Der Regionalhaushalt arbeitet seit Juni 2024 mit vorläufigen Zwölfteln.'
          : 'The regional budget has been running on provisional twelfths since June 2024.',
    url: `${siteUrl}/${locale}/domains/budget`,
  },
  {
    title: locale === 'fr' ? 'Mobilité' : locale === 'nl' ? 'Mobiliteit' : locale === 'de' ? 'Mobilität' : 'Mobility',
    domain: 'mobility',
    status: locale === 'fr' ? 'en cours' : locale === 'nl' ? 'lopend' : locale === 'de' ? 'laufend' : 'ongoing',
    summary: locale === 'fr'
      ? 'Les investissements dans les transports publics bruxellois restent gelés.'
      : locale === 'nl'
        ? 'Investeringen in het Brusselse openbaar vervoer blijven bevroren.'
        : locale === 'de'
          ? 'Die Investitionen in den Brüsseler ÖPNV bleiben eingefroren.'
          : 'Investments in Brussels public transport remain frozen.',
    url: `${siteUrl}/${locale}/domains/mobility`,
  },
];

async function main() {
  const resend = new Resend(apiKey);

  const subjects: Record<string, string> = {
    fr: `[TEST] Digest hebdomadaire — ${weekOf}`,
    nl: `[TEST] Wekelijkse samenvatting — ${weekOf}`,
    en: `[TEST] Weekly digest — ${weekOf}`,
    de: `[TEST] Wöchentliche Zusammenfassung — ${weekOf}`,
  };

  console.log(`Sending test digest to ${email} (locale: ${locale})...`);

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: subjects[locale] || subjects.fr,
    react: DigestEmail({
      locale,
      updates: sampleUpdates,
      weekOf,
      unsubscribeUrl: `${siteUrl}/${locale}/subscribe/preferences?token=test-token`,
    }),
  });

  if (error) {
    console.error('Failed to send:', error);
    process.exit(1);
  }

  console.log(`Sent! Email ID: ${data?.id}`);
}

main();
