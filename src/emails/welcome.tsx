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

interface WelcomeEmailProps {
  locale: 'fr' | 'nl';
  topics: string[];
  unsubscribeUrl: string;
}

const translations = {
  fr: {
    preview: 'Bienvenue sur Brussels Governance Monitor',
    title: 'Bienvenue',
    greeting: 'Votre inscription est confirmée.',
    explanation:
      'Vous recevrez un digest hebdomadaire (le lundi) avec les mises à jour des domaines que vous suivez. Pas de changement = pas d\'email.',
    topicsTitle: 'Vos thèmes suivis :',
    topicLabels: {
      budget: 'Budget',
      mobility: 'Mobilité',
      employment: 'Emploi',
      housing: 'Logement',
      climate: 'Climat & Énergie',
      social: 'Social & Santé',
      solutions: 'Sortie de crise',
    } as Record<string, string>,
    frequency: 'Fréquence : maximum 1 email par semaine.',
    unsubscribe: 'Gérer mes préférences ou me désabonner',
    footer: 'Brussels Governance Monitor — Un projet d\'intérêt général hébergé par Advice That SRL',
    disclaimer: 'Non affilié à aucun parti politique',
  },
  nl: {
    preview: 'Welkom bij Brussels Governance Monitor',
    title: 'Welkom',
    greeting: 'Uw inschrijving is bevestigd.',
    explanation:
      'U ontvangt een wekelijkse samenvatting (op maandag) met updates over de domeinen die u volgt. Geen wijziging = geen e-mail.',
    topicsTitle: 'Uw gevolgde thema\'s:',
    topicLabels: {
      budget: 'Budget',
      mobility: 'Mobiliteit',
      employment: 'Werkgelegenheid',
      housing: 'Huisvesting',
      climate: 'Klimaat & Energie',
      social: 'Sociaal & Gezondheid',
      solutions: 'Uitwegen uit de crisis',
    } as Record<string, string>,
    frequency: 'Frequentie: maximaal 1 e-mail per week.',
    unsubscribe: 'Mijn voorkeuren beheren of uitschrijven',
    footer: 'Brussels Governance Monitor — Een project van algemeen belang gehost door Advice That SRL',
    disclaimer: 'Niet gelieerd aan enige politieke partij',
  },
};

export default function WelcomeEmail({ locale, topics, unsubscribeUrl }: WelcomeEmailProps) {
  const t = translations[locale] || translations.fr;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{t.title}</Heading>

          <Text style={styles.text}>{t.greeting}</Text>
          <Text style={styles.text}>{t.explanation}</Text>

          <Section style={styles.topicsSection}>
            <Text style={styles.topicsTitle}>{t.topicsTitle}</Text>
            {topics.map((topic) => (
              <Text key={topic} style={styles.topicItem}>
                — {t.topicLabels[topic] || topic}
              </Text>
            ))}
          </Section>

          <Text style={styles.frequency}>{t.frequency}</Text>

          <Hr style={styles.hr} />

          <Link href={unsubscribeUrl} style={styles.unsubscribeLink}>
            {t.unsubscribe}
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
  frequency: {
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '16px 0 0',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  unsubscribeLink: {
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
