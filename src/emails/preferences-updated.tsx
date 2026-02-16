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
  topicLabels: Record<string, string>;
  manage: string;
  footer: string;
  disclaimer: string;
}

const translations: Record<string, PreferencesTranslation> = {
  fr: {
    preview: 'Vos préférences ont été mises à jour',
    title: 'Préférences mises à jour',
    greeting: 'Vos préférences de notification ont été enregistrées.',
    topicsTitle: 'Vos thèmes suivis :',
    topicLabels: {
      budget: 'Budget',
      mobility: 'Mobilité',
      employment: 'Emploi',
      housing: 'Logement',
      climate: 'Climat & Énergie',
      social: 'Social & Santé',
      security: 'Sécurité',
      economy: 'Économie',
      cleanliness: 'Propreté',
      institutional: 'Institutionnel',
      solutions: 'Sortie de crise',
    },
    manage: 'Gérer mes préférences',
    footer:
      'Brussels Governance Monitor — Un projet d\'intérêt général hébergé par Advice That SRL',
    disclaimer: 'Non affilié à aucun parti politique',
  },
  nl: {
    preview: 'Uw voorkeuren zijn bijgewerkt',
    title: 'Voorkeuren bijgewerkt',
    greeting: 'Uw meldingsvoorkeuren zijn opgeslagen.',
    topicsTitle: 'Uw gevolgde thema\'s:',
    topicLabels: {
      budget: 'Budget',
      mobility: 'Mobiliteit',
      employment: 'Werkgelegenheid',
      housing: 'Huisvesting',
      climate: 'Klimaat & Energie',
      social: 'Sociaal & Gezondheid',
      security: 'Veiligheid',
      economy: 'Economie',
      cleanliness: 'Netheid',
      institutional: 'Institutioneel',
      solutions: 'Uitwegen uit de crisis',
    },
    manage: 'Mijn voorkeuren beheren',
    footer:
      'Brussels Governance Monitor — Een project van algemeen belang gehost door Advice That SRL',
    disclaimer: 'Niet gelieerd aan enige politieke partij',
  },
  en: {
    preview: 'Your preferences have been updated',
    title: 'Preferences updated',
    greeting: 'Your notification preferences have been saved.',
    topicsTitle: 'Your followed topics:',
    topicLabels: {
      budget: 'Budget',
      mobility: 'Mobility',
      employment: 'Employment',
      housing: 'Housing',
      climate: 'Climate & Energy',
      social: 'Social & Health',
      security: 'Security',
      economy: 'Economy',
      cleanliness: 'Cleanliness',
      institutional: 'Institutional',
      solutions: 'Exit paths',
    },
    manage: 'Manage my preferences',
    footer:
      'Brussels Governance Monitor — A public interest project hosted by Advice That SRL',
    disclaimer: 'Not affiliated with any political party',
  },
  de: {
    preview: 'Ihre Einstellungen wurden aktualisiert',
    title: 'Einstellungen aktualisiert',
    greeting: 'Ihre Benachrichtigungseinstellungen wurden gespeichert.',
    topicsTitle: 'Ihre verfolgten Themen:',
    topicLabels: {
      budget: 'Haushalt',
      mobility: 'Mobilität',
      employment: 'Beschäftigung',
      housing: 'Wohnen',
      climate: 'Klima & Energie',
      social: 'Soziales & Gesundheit',
      security: 'Sicherheit',
      economy: 'Wirtschaft',
      cleanliness: 'Sauberkeit',
      institutional: 'Institutionell',
      solutions: 'Auswege aus der Krise',
    },
    manage: 'Meine Einstellungen verwalten',
    footer:
      'Brussels Governance Monitor — Ein Projekt im öffentlichen Interesse, gehostet von Advice That SRL',
    disclaimer: 'Keiner politischen Partei angeschlossen',
  },
};

export default function PreferencesUpdatedEmail({
  locale,
  topics,
  preferencesUrl,
}: PreferencesUpdatedEmailProps) {
  const t = translations[locale] || translations.fr;

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
                — {t.topicLabels[topic] || topic}
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
