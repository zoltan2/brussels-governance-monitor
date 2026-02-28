// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components';

interface ConfirmEmailProps {
  locale: string;
  confirmUrl: string;
}

const translations: Record<string, {
  preview: string;
  title: string;
  greeting: string;
  button: string;
  expiry: string;
  ignore: string;
  footer: string;
}> = {
  fr: {
    preview: 'Confirmez votre inscription à Brussels Governance Monitor',
    title: 'Confirmez votre email',
    greeting:
      "Vous avez demandé à recevoir les alertes de Brussels Governance Monitor. Cliquez sur le bouton ci-dessous pour confirmer votre inscription.",
    button: 'Confirmer mon inscription',
    expiry: 'Ce lien expire dans 48 heures.',
    ignore:
      "Si vous n'avez pas demandé cette inscription, ignorez simplement cet email.",
    footer:
      "Brussels Governance Monitor — Un projet d'intérêt général hébergé par Advice That SRL",
  },
  nl: {
    preview: 'Bevestig uw inschrijving bij Brussels Governance Monitor',
    title: 'Bevestig uw e-mail',
    greeting:
      'U hebt gevraagd om waarschuwingen te ontvangen van Brussels Governance Monitor. Klik op de onderstaande knop om uw inschrijving te bevestigen.',
    button: 'Mijn inschrijving bevestigen',
    expiry: 'Deze link vervalt na 48 uur.',
    ignore:
      'Als u deze inschrijving niet hebt aangevraagd, negeer dan deze e-mail.',
    footer:
      'Brussels Governance Monitor — Een project van algemeen belang gehost door Advice That SRL',
  },
  en: {
    preview: 'Confirm your subscription to Brussels Governance Monitor',
    title: 'Confirm your email',
    greeting:
      'You have requested to receive alerts from Brussels Governance Monitor. Click the button below to confirm your subscription.',
    button: 'Confirm my subscription',
    expiry: 'This link expires in 48 hours.',
    ignore:
      'If you did not request this subscription, simply ignore this email.',
    footer:
      'Brussels Governance Monitor — A public interest project hosted by Advice That SRL',
  },
  de: {
    preview: 'Bestätigen Sie Ihre Anmeldung bei Brussels Governance Monitor',
    title: 'Bestätigen Sie Ihre E-Mail',
    greeting:
      'Sie haben Benachrichtigungen von Brussels Governance Monitor angefordert. Klicken Sie auf die Schaltfläche unten, um Ihre Anmeldung zu bestätigen.',
    button: 'Meine Anmeldung bestätigen',
    expiry: 'Dieser Link läuft in 48 Stunden ab.',
    ignore:
      'Wenn Sie diese Anmeldung nicht angefordert haben, ignorieren Sie diese E-Mail einfach.',
    footer:
      'Brussels Governance Monitor — Ein Projekt im öffentlichen Interesse, gehostet von Advice That SRL',
  },
};

export default function ConfirmEmail({ locale, confirmUrl }: ConfirmEmailProps) {
  const t = translations[locale] || translations.fr;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{t.title}</Heading>

          <Text style={styles.text}>{t.greeting}</Text>

          <Button href={confirmUrl} style={styles.button}>
            {t.button}
          </Button>

          <Text style={styles.expiry}>{t.expiry}</Text>
          <Text style={styles.ignore}>{t.ignore}</Text>

          <Hr style={styles.hr} />

          <Text style={styles.footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    margin: '0',
    padding: '0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '40px auto',
    maxWidth: '520px',
    padding: '40px 32px',
  },
  heading: {
    color: '#1a1f35',
    fontSize: '24px',
    fontWeight: '700' as const,
    lineHeight: '1.3',
    margin: '0 0 16px',
  },
  text: {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 12px',
  },
  button: {
    backgroundColor: '#1a1f35',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'block' as const,
    fontSize: '14px',
    fontWeight: '600' as const,
    margin: '24px 0',
    padding: '12px 24px',
    textAlign: 'center' as const,
    textDecoration: 'none',
  },
  expiry: {
    color: '#6b7280',
    fontSize: '12px',
    margin: '0 0 8px',
  },
  ignore: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: '0 0 16px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  footer: {
    color: '#9ca3af',
    fontSize: '11px',
    lineHeight: '1.5',
    margin: '0',
  },
};
