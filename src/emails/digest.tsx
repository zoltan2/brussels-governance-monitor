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

interface DigestUpdate {
  title: string;
  domain: string;
  status: string;
  summary: string;
  url: string;
}

interface DigestEmailProps {
  locale: string;
  updates: DigestUpdate[];
  weekOf: string;
  unsubscribeUrl: string;
}

const translations: Record<string, {
  preview: string;
  title: string;
  intro: string;
  noUpdates: string;
  readMore: string;
  unsubscribe: string;
  footer: string;
  disclaimer: string;
}> = {
  fr: {
    preview: 'Digest hebdomadaire — Brussels Governance Monitor',
    title: 'Digest de la semaine',
    intro: 'Voici les mises à jour des domaines que vous suivez.',
    noUpdates: 'Aucune mise à jour cette semaine pour vos thèmes suivis.',
    readMore: 'Lire la fiche →',
    unsubscribe: 'Gérer mes préférences ou me désabonner',
    footer:
      "Brussels Governance Monitor — Un projet d'intérêt général hébergé par Advice That SRL",
    disclaimer: 'Non affilié à aucun parti politique',
  },
  nl: {
    preview: 'Wekelijkse samenvatting — Brussels Governance Monitor',
    title: 'Samenvatting van de week',
    intro: 'Hier zijn de updates van de domeinen die u volgt.',
    noUpdates: 'Geen updates deze week voor uw gevolgde thema\'s.',
    readMore: 'Lees de fiche →',
    unsubscribe: 'Mijn voorkeuren beheren of uitschrijven',
    footer:
      'Brussels Governance Monitor — Een project van algemeen belang gehost door Advice That SRL',
    disclaimer: 'Niet gelieerd aan enige politieke partij',
  },
  en: {
    preview: 'Weekly digest — Brussels Governance Monitor',
    title: 'Weekly digest',
    intro: 'Here are the updates for the domains you follow.',
    noUpdates: 'No updates this week for your followed topics.',
    readMore: 'Read more →',
    unsubscribe: 'Manage my preferences or unsubscribe',
    footer:
      'Brussels Governance Monitor — A public interest project hosted by Advice That SRL',
    disclaimer: 'Not affiliated with any political party',
  },
  de: {
    preview: 'Wöchentliche Zusammenfassung — Brussels Governance Monitor',
    title: 'Wöchentliche Zusammenfassung',
    intro: 'Hier sind die Aktualisierungen der Bereiche, denen Sie folgen.',
    noUpdates: 'Keine Aktualisierungen diese Woche für Ihre verfolgten Themen.',
    readMore: 'Weiterlesen →',
    unsubscribe: 'Meine Einstellungen verwalten oder abmelden',
    footer:
      'Brussels Governance Monitor — Ein Projekt im öffentlichen Interesse, gehostet von Advice That SRL',
    disclaimer: 'Keiner politischen Partei angeschlossen',
  },
};

export default function DigestEmail({
  locale,
  updates,
  weekOf,
  unsubscribeUrl,
}: DigestEmailProps) {
  const t = translations[locale] || translations.fr;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            {t.title} — {weekOf}
          </Heading>

          <Text style={styles.text}>{t.intro}</Text>

          {updates.length === 0 ? (
            <Text style={styles.noUpdates}>{t.noUpdates}</Text>
          ) : (
            updates.map((update) => (
              <Section key={update.url} style={styles.updateSection}>
                <Text style={styles.updateTitle}>{update.title}</Text>
                <Text style={styles.updateStatus}>{update.status}</Text>
                <Text style={styles.updateSummary}>{update.summary}</Text>
                <Link href={update.url} style={styles.readMore}>
                  {t.readMore}
                </Link>
              </Section>
            ))
          )}

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
    fontSize: '22px',
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
  noUpdates: {
    color: '#6b7280',
    fontSize: '14px',
    fontStyle: 'italic' as const,
    margin: '16px 0',
  },
  updateSection: {
    borderLeft: '3px solid #1e3a5f',
    margin: '16px 0',
    padding: '8px 0 8px 16px',
  },
  updateTitle: {
    color: '#1a1f35',
    fontSize: '15px',
    fontWeight: '600' as const,
    lineHeight: '1.4',
    margin: '0 0 4px',
  },
  updateStatus: {
    color: '#6b7280',
    fontSize: '12px',
    margin: '0 0 6px',
  },
  updateSummary: {
    color: '#374151',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '0 0 8px',
  },
  readMore: {
    color: '#1e3a5f',
    fontSize: '13px',
    fontWeight: '500' as const,
    textDecoration: 'none',
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
