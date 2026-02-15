import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface DigestUpdate {
  title: string;
  domain: string;
  status: 'blocked' | 'delayed' | 'ongoing' | 'resolved';
  summary: string;
  url: string;
}

export interface DigestEmailProps {
  locale: string;
  updates: DigestUpdate[];
  weekOf: string;
  unsubscribeUrl: string;
  summaryLine: string;
  weeklyNumber: {
    value: string;
    label: string;
    source: string;
  };
  closingNote: string;
  commitmentCount: number;
  siteUrl: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blocked: { bg: '#f1f5f9', text: '#334155', border: '#94a3b8' },
  delayed: { bg: '#fffbeb', text: '#92400e', border: '#f59e0b' },
  ongoing: { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' },
  resolved: { bg: '#f0fdfa', text: '#115e59', border: '#14b8a6' },
};

const translations: Record<string, {
  preview: string;
  title: string;
  summaryLabel: string;
  weeklyNumberTitle: string;
  commitmentsTitle: string;
  commitmentsLink: string;
  commitmentsDescription: string;
  updatedDomainsTitle: string;
  readMore: string;
  welcome: string;
  managePrefs: string;
  footer: string;
  disclaimer: string;
  statusLabels: Record<string, string>;
  commitmentsSuffix: string;
}> = {
  fr: {
    preview: 'Digest hebdomadaire — Brussels Governance Monitor',
    title: 'Digest de la semaine',
    summaryLabel: 'En bref',
    weeklyNumberTitle: 'Le chiffre de la semaine',
    commitmentsTitle: 'Suivi des engagements',
    commitmentsLink: 'engagements',
    commitmentsDescription: 'promesses chiffrées de la DPR',
    updatedDomainsTitle: 'Domaines mis à jour',
    readMore: 'Lire la fiche →',
    welcome: 'Bienvenue dans le digest BGM',
    managePrefs: 'Gérer mes préférences ou me désabonner',
    footer: 'Brussels Governance Monitor — Advice That SRL — Bruxelles',
    disclaimer: 'Non affilié à aucun parti politique',
    statusLabels: { blocked: 'Bloqué', delayed: 'Retardé', ongoing: 'En cours', resolved: 'Résolu' },
    commitmentsSuffix: 'promesses chiffrées',
  },
  nl: {
    preview: 'Wekelijkse samenvatting — Brussels Governance Monitor',
    title: 'Samenvatting van de week',
    summaryLabel: 'In het kort',
    weeklyNumberTitle: 'Het cijfer van de week',
    commitmentsTitle: 'Opvolging engagementen',
    commitmentsLink: 'engagementen',
    commitmentsDescription: 'becijferde beloften van het regeerakkoord',
    updatedDomainsTitle: 'Bijgewerkte domeinen',
    readMore: 'Lees de fiche →',
    welcome: 'Welkom bij de BGM-digest',
    managePrefs: 'Mijn voorkeuren beheren of uitschrijven',
    footer: 'Brussels Governance Monitor — Advice That SRL — Brussel',
    disclaimer: 'Niet gelieerd aan enige politieke partij',
    statusLabels: { blocked: 'Geblokkeerd', delayed: 'Vertraagd', ongoing: 'Lopend', resolved: 'Opgelost' },
    commitmentsSuffix: 'becijferde beloften',
  },
  en: {
    preview: 'Weekly digest — Brussels Governance Monitor',
    title: 'Weekly digest',
    summaryLabel: 'At a glance',
    weeklyNumberTitle: 'Number of the week',
    commitmentsTitle: 'Commitment tracker',
    commitmentsLink: 'commitments',
    commitmentsDescription: 'quantified pledges from the DPR',
    updatedDomainsTitle: 'Updated domains',
    readMore: 'Read more →',
    welcome: 'Welcome to the BGM digest',
    managePrefs: 'Manage my preferences or unsubscribe',
    footer: 'Brussels Governance Monitor — Advice That SRL — Brussels',
    disclaimer: 'Not affiliated with any political party',
    statusLabels: { blocked: 'Blocked', delayed: 'Delayed', ongoing: 'Ongoing', resolved: 'Resolved' },
    commitmentsSuffix: 'quantified pledges',
  },
  de: {
    preview: 'Wöchentliche Zusammenfassung — Brussels Governance Monitor',
    title: 'Wöchentliche Zusammenfassung',
    summaryLabel: 'Auf einen Blick',
    weeklyNumberTitle: 'Die Zahl der Woche',
    commitmentsTitle: 'Verfolgung der Verpflichtungen',
    commitmentsLink: 'verpflichtungen',
    commitmentsDescription: 'bezifferte Versprechen des Regierungsabkommens',
    updatedDomainsTitle: 'Aktualisierte Bereiche',
    readMore: 'Weiterlesen →',
    welcome: 'Willkommen beim BGM-Digest',
    managePrefs: 'Meine Einstellungen verwalten oder abmelden',
    footer: 'Brussels Governance Monitor — Advice That SRL — Brüssel',
    disclaimer: 'Keiner politischen Partei angeschlossen',
    statusLabels: { blocked: 'Blockiert', delayed: 'Verzögert', ongoing: 'Laufend', resolved: 'Gelöst' },
    commitmentsSuffix: 'bezifferte Versprechen',
  },
};

export default function DigestEmail({
  locale,
  updates,
  weekOf,
  unsubscribeUrl,
  summaryLine,
  weeklyNumber,
  closingNote,
  commitmentCount,
  siteUrl,
}: DigestEmailProps) {
  const t = translations[locale] || translations.fr;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Img
              src={`${siteUrl}/logo.png`}
              width="28"
              height="28"
              alt="BGM"
              style={styles.logo}
            />
            <Text style={styles.headerText}>Brussels Governance Monitor</Text>
          </Section>

          {/* Title */}
          <Heading style={styles.heading}>
            {t.title}
          </Heading>
          <Text style={styles.weekOf}>{weekOf}</Text>

          {/* Welcome */}
          <Text style={styles.welcome}>{t.welcome}</Text>

          {/* Summary line */}
          <Section style={styles.summarySection}>
            <Text style={styles.summaryLabel}>{t.summaryLabel}</Text>
            <Text style={styles.summaryText}>{summaryLine}</Text>
          </Section>

          {/* Weekly number */}
          <Section style={styles.weeklyNumberSection}>
            <Text style={styles.weeklyNumberTitle}>{t.weeklyNumberTitle}</Text>
            <Text style={styles.weeklyNumberValue}>{weeklyNumber.value}</Text>
            <Text style={styles.weeklyNumberLabel}>{weeklyNumber.label}</Text>
            <Text style={styles.weeklyNumberSource}>{weeklyNumber.source}</Text>
          </Section>

          {/* DPR commitments */}
          <Section style={styles.commitmentsSection}>
            <Text style={styles.commitmentsTitle}>{t.commitmentsTitle}</Text>
            <Text style={styles.commitmentsText}>
              {commitmentCount} {t.commitmentsSuffix}
            </Text>
            <Link
              href={`${siteUrl}/${locale}/${t.commitmentsLink}`}
              style={styles.commitmentsLink}
            >
              {t.commitmentsTitle} →
            </Link>
          </Section>

          <Hr style={styles.hr} />

          {/* Updated domains */}
          <Heading as="h2" style={styles.subheading}>{t.updatedDomainsTitle}</Heading>

          {updates.map((update) => {
            const colors = STATUS_COLORS[update.status] || STATUS_COLORS.ongoing;
            return (
              <Section key={update.url} style={styles.updateSection}>
                <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td>
                        <Text style={styles.updateTitle}>{update.title}</Text>
                      </td>
                      <td style={{ textAlign: 'right' as const, verticalAlign: 'top' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600' as const,
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {t.statusLabels[update.status] || update.status}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <Text style={styles.updateSummary}>{update.summary}</Text>
                <Link href={update.url} style={styles.readMore}>
                  {t.readMore}
                </Link>
              </Section>
            );
          })}

          {/* Closing note */}
          {closingNote && (
            <>
              <Section style={styles.closingSection}>
                <Text style={styles.closingText}>{closingNote}</Text>
              </Section>
              <Hr style={styles.hr} />
            </>
          )}

          {/* Footer */}
          <Link href={unsubscribeUrl} style={styles.unsubscribeLink}>
            {t.managePrefs}
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
  header: {
    marginBottom: '24px',
  },
  logo: {
    display: 'inline-block' as const,
    verticalAlign: 'middle' as const,
    marginRight: '8px',
  },
  headerText: {
    display: 'inline' as const,
    color: '#1a1f35',
    fontSize: '14px',
    fontWeight: '600' as const,
    verticalAlign: 'middle' as const,
    margin: '0',
  },
  heading: {
    color: '#1a1f35',
    fontSize: '22px',
    fontWeight: '700' as const,
    lineHeight: '1.3',
    margin: '0 0 4px',
  },
  weekOf: {
    color: '#6b7280',
    fontSize: '13px',
    margin: '0 0 12px',
  },
  welcome: {
    color: '#374151',
    fontSize: '15px',
    lineHeight: '1.5',
    margin: '0 0 20px',
  },
  summarySection: {
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: '11px',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 4px',
  },
  summaryText: {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
  },
  weeklyNumberSection: {
    backgroundColor: '#f9fafb',
    borderLeft: '3px solid #1e3a5f',
    borderRadius: '0 6px 6px 0',
    padding: '16px',
    marginBottom: '20px',
  },
  weeklyNumberTitle: {
    color: '#6b7280',
    fontSize: '11px',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 8px',
  },
  weeklyNumberValue: {
    color: '#1e3a5f',
    fontSize: '28px',
    fontWeight: '700' as const,
    lineHeight: '1.2',
    margin: '0 0 4px',
  },
  weeklyNumberLabel: {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.4',
    margin: '0 0 4px',
  },
  weeklyNumberSource: {
    color: '#9ca3af',
    fontSize: '11px',
    fontStyle: 'italic' as const,
    margin: '0',
  },
  commitmentsSection: {
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '20px',
  },
  commitmentsTitle: {
    color: '#1e40af',
    fontSize: '14px',
    fontWeight: '600' as const,
    margin: '0 0 4px',
  },
  commitmentsText: {
    color: '#374151',
    fontSize: '13px',
    margin: '0 0 8px',
  },
  commitmentsLink: {
    color: '#1e3a5f',
    fontSize: '13px',
    fontWeight: '500' as const,
    textDecoration: 'none',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  subheading: {
    color: '#1a1f35',
    fontSize: '16px',
    fontWeight: '600' as const,
    margin: '0 0 16px',
  },
  updateSection: {
    borderLeft: '3px solid #1e3a5f',
    margin: '0 0 16px',
    padding: '8px 0 8px 16px',
  },
  updateTitle: {
    color: '#1a1f35',
    fontSize: '15px',
    fontWeight: '600' as const,
    lineHeight: '1.4',
    margin: '0 0 4px',
  },
  updateSummary: {
    color: '#374151',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '4px 0 8px',
  },
  readMore: {
    color: '#1e3a5f',
    fontSize: '13px',
    fontWeight: '500' as const,
    textDecoration: 'none',
  },
  closingSection: {
    backgroundColor: '#fafafa',
    borderRadius: '6px',
    padding: '16px',
    marginBottom: '4px',
  },
  closingText: {
    color: '#374151',
    fontSize: '14px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    margin: '0',
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
