// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { getTopicLabels } from './topic-labels';

interface PreferencesUpdatedEmailProps {
  locale: string;
  topics: string[];
  preferencesUrl: string;
}

interface PreferencesTranslation {
  preview: string;
  title: string;
  greeting: string;
  topicsTitle: string;
  manage: string;
  footer: string;
  disclaimer: string;
}

const translations: Record<string, PreferencesTranslation> = {
  fr: {
    preview: 'Vos pr\u00e9f\u00e9rences ont \u00e9t\u00e9 mises \u00e0 jour',
    title: 'Pr\u00e9f\u00e9rences mises \u00e0 jour',
    greeting: 'Vos pr\u00e9f\u00e9rences de notification ont \u00e9t\u00e9 enregistr\u00e9es.',
    topicsTitle: 'Vos th\u00e8mes suivis :',
    manage: 'G\u00e9rer mes pr\u00e9f\u00e9rences',
    footer:
      'Brussels Governance Monitor \u2014 Un projet d\'int\u00e9r\u00eat g\u00e9n\u00e9ral h\u00e9berg\u00e9 par Advice That SRL',
    disclaimer: 'Non affili\u00e9 \u00e0 aucun parti politique',
  },
  nl: {
    preview: 'Uw voorkeuren zijn bijgewerkt',
    title: 'Voorkeuren bijgewerkt',
    greeting: 'Uw meldingsvoorkeuren zijn opgeslagen.',
    topicsTitle: 'Uw gevolgde thema\'s:',
    manage: 'Mijn voorkeuren beheren',
    footer:
      'Brussels Governance Monitor \u2014 Een project van algemeen belang gehost door Advice That SRL',
    disclaimer: 'Niet gelieerd aan enige politieke partij',
  },
  en: {
    preview: 'Your preferences have been updated',
    title: 'Preferences updated',
    greeting: 'Your notification preferences have been saved.',
    topicsTitle: 'Your followed topics:',
    manage: 'Manage my preferences',
    footer:
      'Brussels Governance Monitor \u2014 A public interest project hosted by Advice That SRL',
    disclaimer: 'Not affiliated with any political party',
  },
  de: {
    preview: 'Ihre Einstellungen wurden aktualisiert',
    title: 'Einstellungen aktualisiert',
    greeting: 'Ihre Benachrichtigungseinstellungen wurden gespeichert.',
    topicsTitle: 'Ihre verfolgten Themen:',
    manage: 'Meine Einstellungen verwalten',
    footer:
      'Brussels Governance Monitor \u2014 Ein Projekt im \u00f6ffentlichen Interesse, gehostet von Advice That SRL',
    disclaimer: 'Keiner politischen Partei angeschlossen',
  },
};

export default function PreferencesUpdatedEmail({
  locale,
  topics,
  preferencesUrl,
}: PreferencesUpdatedEmailProps) {
  const t = translations[locale] || translations.fr;
  const labels = getTopicLabels(locale);

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{t.title}</Heading>

          <Text style={styles.text}>{t.greeting}</Text>

          <Section style={styles.topicsSection}>
            <Text style={styles.topicsTitle}>{t.topicsTitle}</Text>
            {topics.map((topic) => (
              <Text key={topic} style={styles.topicItem}>
                — {labels[topic] || topic}
              </Text>
            ))}
          </Section>

          <Hr style={styles.hr} />

          <Link href={preferencesUrl} style={styles.manageLink}>
            {t.manage}
          </Link>

          <Text style={styles.footer}>{t.footer}</Text>
          <Text style={styles.disclaimer}>{t.disclaimer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  topicsSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    margin: '16px 0',
    padding: '16px',
  },
  topicsTitle: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: '600' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
  },
  topicItem: {
    color: '#1a1f35',
    fontSize: '14px',
    lineHeight: '1.6',
    margin: '0 0 4px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  manageLink: {
    color: '#6b7280',
    display: 'block' as const,
    fontSize: '12px',
    margin: '0 0 16px',
    textDecoration: 'underline',
  },
  footer: {
    color: '#9ca3af',
    fontSize: '11px',
    lineHeight: '1.5',
    margin: '0 0 4px',
  },
  disclaimer: {
    color: '#d1d5db',
    fontSize: '11px',
    lineHeight: '1.5',
    margin: '0',
  },
};
