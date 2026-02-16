import {
  Body,
  Button,
  Head,
  Html,
  Img,
  Link,
  Preview,
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
  weeklyNumber: { value: string; label: string; source: string };
  closingNote: string;
  commitmentCount: number;
  siteUrl: string;
  feedbackYesUrl?: string;
  feedbackNoUrl?: string;
}

const STATUS_STYLES = {
  blocked: { badgeBg: '#f1f5f9', badgeText: '#334155', badgeBorder: '#94a3b8', cardBorder: '#64748b' },
  delayed: { badgeBg: '#fef3c7', badgeText: '#92400e', badgeBorder: '#fbbf24', cardBorder: '#e67e22' },
  ongoing: { badgeBg: '#eff6ff', badgeText: '#1e40af', badgeBorder: '#93c5fd', cardBorder: '#2563eb' },
  resolved: { badgeBg: '#f0fdfa', badgeText: '#115e59', badgeBorder: '#14b8a6', cardBorder: '#0d9488' },
} as const;

const T: Record<string, {
  preview: string;
  title: string;
  welcome: string;
  briefLabel: string;
  weeklyNumberTitle: string;
  commitmentsTitle: string;
  commitmentsDesc: string;
  commitmentsLink: string;
  seeButton: string;
  domainsTitle: string;
  readMore: string;
  founderTitle: string;
  founderDesc: string;
  feedbackQuestion: string;
  feedbackYes: string;
  feedbackNo: string;
  feedbackMissing: string;
  managePrefs: string;
  unsubscribe: string;
  brand: string;
  entity: string;
  disclaimer: string;
  statusLabels: Record<string, string>;
}> = {
  fr: {
    preview: 'Digest hebdomadaire — Brussels Governance Monitor',
    title: 'Digest de la semaine',
    welcome: 'Bienvenue dans le digest BGM',
    briefLabel: 'EN BREF',
    weeklyNumberTitle: 'LE CHIFFRE DE LA SEMAINE',
    commitmentsTitle: 'Suivi des engagements',
    commitmentsDesc: 'promesses chiffrées de la DPR',
    commitmentsLink: 'engagements',
    seeButton: 'Voir →',
    domainsTitle: 'Domaines mis à jour',
    readMore: 'Lire la fiche →',
    founderTitle: 'Fondateur Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    feedbackQuestion: 'Ce digest vous a été utile ?',
    feedbackYes: '👍 Oui',
    feedbackNo: '👎 Non',
    feedbackMissing: 'Un sujet manque ? Répondez à cet email.',
    managePrefs: 'Gérer mes préférences',
    unsubscribe: 'Se désabonner',
    brand: 'Brussels Governance Monitor',
    entity: 'Advice That SRL — Bruxelles, Belgique',
    disclaimer: 'Non affilié à aucun parti politique',
    statusLabels: { blocked: 'Bloqué', delayed: 'Retardé', ongoing: 'En cours', resolved: 'Résolu' },
  },
  nl: {
    preview: 'Wekelijkse samenvatting — Brussels Governance Monitor',
    title: 'Samenvatting van de week',
    welcome: 'Welkom bij de BGM-digest',
    briefLabel: 'IN HET KORT',
    weeklyNumberTitle: 'HET CIJFER VAN DE WEEK',
    commitmentsTitle: 'Opvolging engagementen',
    commitmentsDesc: 'becijferde beloften van het regeerakkoord',
    commitmentsLink: 'engagementen',
    seeButton: 'Bekijken →',
    domainsTitle: 'Bijgewerkte domeinen',
    readMore: 'Lees de fiche →',
    founderTitle: 'Oprichter Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    feedbackQuestion: 'Was deze digest nuttig voor u?',
    feedbackYes: '👍 Ja',
    feedbackNo: '👎 Nee',
    feedbackMissing: 'Ontbreekt er een onderwerp? Beantwoord deze email.',
    managePrefs: 'Mijn voorkeuren beheren',
    unsubscribe: 'Uitschrijven',
    brand: 'Brussels Governance Monitor',
    entity: 'Advice That SRL — Brussel, België',
    disclaimer: 'Niet gelieerd aan enige politieke partij',
    statusLabels: { blocked: 'Geblokkeerd', delayed: 'Vertraagd', ongoing: 'Lopend', resolved: 'Opgelost' },
  },
  en: {
    preview: 'Weekly digest — Brussels Governance Monitor',
    title: 'Weekly digest',
    welcome: 'Welcome to the BGM digest',
    briefLabel: 'AT A GLANCE',
    weeklyNumberTitle: 'NUMBER OF THE WEEK',
    commitmentsTitle: 'Commitment tracker',
    commitmentsDesc: 'quantified pledges from the DPR',
    commitmentsLink: 'commitments',
    seeButton: 'View →',
    domainsTitle: 'Updated domains',
    readMore: 'Read more →',
    founderTitle: 'Founder, Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    feedbackQuestion: 'Was this digest useful?',
    feedbackYes: '👍 Yes',
    feedbackNo: '👎 No',
    feedbackMissing: 'Missing a topic? Reply to this email.',
    managePrefs: 'Manage preferences',
    unsubscribe: 'Unsubscribe',
    brand: 'Brussels Governance Monitor',
    entity: 'Advice That SRL — Brussels, Belgium',
    disclaimer: 'Not affiliated with any political party',
    statusLabels: { blocked: 'Blocked', delayed: 'Delayed', ongoing: 'Ongoing', resolved: 'Resolved' },
  },
  de: {
    preview: 'Wöchentliche Zusammenfassung — Brussels Governance Monitor',
    title: 'Wöchentliche Zusammenfassung',
    welcome: 'Willkommen beim BGM-Digest',
    briefLabel: 'AUF EINEN BLICK',
    weeklyNumberTitle: 'DIE ZAHL DER WOCHE',
    commitmentsTitle: 'Verfolgung der Verpflichtungen',
    commitmentsDesc: 'bezifferte Versprechen des Regierungsabkommens',
    commitmentsLink: 'verpflichtungen',
    seeButton: 'Ansehen →',
    domainsTitle: 'Aktualisierte Bereiche',
    readMore: 'Weiterlesen →',
    founderTitle: 'Gründer, Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    feedbackQuestion: 'War dieser Digest nützlich?',
    feedbackYes: '👍 Ja',
    feedbackNo: '👎 Nein',
    feedbackMissing: 'Fehlt ein Thema? Antworten Sie auf diese E-Mail.',
    managePrefs: 'Einstellungen verwalten',
    unsubscribe: 'Abmelden',
    brand: 'Brussels Governance Monitor',
    entity: 'Advice That SRL — Brüssel, Belgien',
    disclaimer: 'Keiner politischen Partei angeschlossen',
    statusLabels: { blocked: 'Blockiert', delayed: 'Verzögert', ongoing: 'Laufend', resolved: 'Gelöst' },
  },
};

/** Generate a plain text version of the digest for multipart emails. */
export function generateDigestPlainText({
  locale,
  updates,
  weekOf,
  unsubscribeUrl,
  summaryLine,
  weeklyNumber,
  closingNote,
  commitmentCount,
  siteUrl,
}: DigestEmailProps): string {
  const t = T[locale] || T.fr;

  // Strip markdown markers for plain text
  const plainNote = closingNote
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');

  const lines: string[] = [
    `${t.title} — ${weekOf}`,
    t.welcome,
    '',
    `${t.briefLabel}: ${summaryLine}`,
    '',
    t.weeklyNumberTitle,
    weeklyNumber.value,
    weeklyNumber.label,
    weeklyNumber.source,
    '',
    `${t.commitmentsTitle}: ${commitmentCount} ${t.commitmentsDesc}`,
    `${siteUrl}/${locale}/${t.commitmentsLink}`,
    '',
    '---',
    '',
    t.domainsTitle,
    '',
  ];

  for (const update of updates) {
    const statusLabel = t.statusLabels[update.status] || update.status;
    lines.push(`[${statusLabel}] ${update.title}`);
    lines.push(update.summary);
    lines.push(`${t.readMore} ${update.url}`);
    lines.push('');
  }

  if (plainNote) {
    lines.push('---', '', plainNote, '');
    lines.push('Zoltán Jánosi');
    lines.push(t.founderTitle);
    lines.push(t.founderDesc);
    lines.push('');
  }

  lines.push('---', '');
  lines.push(`${t.managePrefs}: ${unsubscribeUrl}`);
  lines.push('');
  lines.push(`${t.brand} — governance.brussels`);
  lines.push(t.entity);
  lines.push(t.disclaimer);

  return lines.join('\n');
}

/** Parse simple markdown (line breaks, **bold**, *italic*) into React nodes. */
function renderFormattedText(
  text: string,
  baseStyle: React.CSSProperties,
): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) result.push(<br key={`br-${lineIdx}`} />);

    // Split on **bold** and *italic* markers
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    parts.forEach((part, partIdx) => {
      const key = `${lineIdx}-${partIdx}`;
      if (part.startsWith('**') && part.endsWith('**')) {
        result.push(
          <strong key={key} style={{ ...baseStyle, fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>,
        );
      } else if (part.startsWith('*') && part.endsWith('*')) {
        result.push(
          <em key={key} style={{ ...baseStyle, fontStyle: 'italic' }}>
            {part.slice(1, -1)}
          </em>,
        );
      } else if (part) {
        result.push(<span key={key}>{part}</span>);
      }
    });
  });

  return result;
}

/**
 * Inner content component — renders the main white container without Html/Head/Body.
 * Exported for reuse in digest-preview.tsx.
 */
export function DigestContent({
  locale,
  updates,
  weekOf,
  unsubscribeUrl,
  summaryLine,
  weeklyNumber,
  closingNote,
  commitmentCount,
  siteUrl,
  feedbackYesUrl,
  feedbackNoUrl,
}: DigestEmailProps) {
  const t = T[locale] || T.fr;

  return (
    <table
      align="center"
      role="presentation"
      width="640"
      cellPadding={0}
      cellSpacing={0}
      style={{
        maxWidth: '640px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden' as const,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <tbody>
        {/* ===== HEADER ===== */}
        <tr>
          <td
            style={{
              background: 'linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)',
              backgroundColor: '#1a2744',
              padding: '32px 40px 28px',
            }}
          >
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td>
                    <Img
                      src={`${siteUrl}/logo.png`}
                      width="32"
                      height="32"
                      alt="BGM"
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        marginRight: '10px',
                        borderRadius: '6px',
                      }}
                    />
                    <span
                      style={{
                        color: '#94a3c3',
                        fontSize: '14px',
                        fontWeight: 500,
                        verticalAlign: 'middle',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Brussels Governance Monitor
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingTop: '20px' }}>
                    <p style={{ margin: '0 0 6px', color: '#ffffff', fontSize: '26px', fontWeight: 700, lineHeight: '1.2' }}>
                      {t.title}
                    </p>
                    <p style={{ margin: '0 0 12px', color: '#94a3c3', fontSize: '14px' }}>
                      {weekOf}
                    </p>
                    <p style={{ margin: 0, color: '#cbd5e1', fontSize: '15px' }}>
                      {t.welcome}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        {/* ===== EN BREF BAR ===== */}
        <tr>
          <td style={{ padding: '0 40px' }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                marginTop: '28px',
                backgroundColor: '#f0f4f8',
                borderRadius: '8px',
                borderLeft: '4px solid #2563eb',
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        marginRight: '10px',
                        verticalAlign: 'middle',
                      }}
                    >
                      {t.briefLabel}
                    </span>
                    <span
                      style={{
                        color: '#334155',
                        fontSize: '14px',
                        fontWeight: 500,
                        verticalAlign: 'middle',
                      }}
                    >
                      {summaryLine}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        {/* ===== WEEKLY NUMBER ===== */}
        <tr>
          <td style={{ padding: '24px 40px 0' }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{
                background: 'linear-gradient(135deg, #f0f4f8 0%, #e8eef6 100%)',
                backgroundColor: '#f0f4f8',
                borderRadius: '10px',
                borderLeft: '5px solid #2563eb',
                overflow: 'hidden' as const,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '24px 28px' }}>
                    <p
                      style={{
                        margin: '0 0 10px',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      {t.weeklyNumberTitle}
                    </p>
                    <p
                      style={{
                        margin: '0 0 6px',
                        color: '#1a2744',
                        fontSize: '40px',
                        fontWeight: 800,
                        lineHeight: '1.1',
                      }}
                    >
                      {weeklyNumber.value}
                    </p>
                    <p style={{ margin: '0 0 8px', color: '#334155', fontSize: '15px', fontWeight: 500 }}>
                      {weeklyNumber.label}
                    </p>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' as const }}>
                      {weeklyNumber.source}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        {/* ===== COMMITMENTS ===== */}
        <tr>
          <td style={{ padding: '20px 40px 0' }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              style={{ backgroundColor: '#eff6ff', borderRadius: '8px' }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '16px 20px' }}>
                    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                      <tbody>
                        <tr>
                          <td>
                            <p style={{ margin: '0 0 2px', color: '#1e40af', fontSize: '15px', fontWeight: 600 }}>
                              {t.commitmentsTitle}
                            </p>
                            <p style={{ margin: 0, color: '#475569', fontSize: '13px' }}>
                              {commitmentCount} {t.commitmentsDesc}
                            </p>
                          </td>
                          <td style={{ textAlign: 'right' as const, verticalAlign: 'middle' as const }}>
                            <Button
                              href={`${siteUrl}/${locale}/${t.commitmentsLink}`}
                              style={{
                                display: 'inline-block',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 600,
                                textDecoration: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                              }}
                            >
                              {t.seeButton}
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        {/* ===== DIVIDER ===== */}
        <tr>
          <td style={{ padding: '28px 40px 0' }}>
            <div style={{ borderTop: '1px solid #e2e8f0', height: 0 }} />
          </td>
        </tr>

        {/* ===== DOMAINS TITLE ===== */}
        <tr>
          <td style={{ padding: '24px 40px 20px' }}>
            <p style={{ margin: 0, color: '#1a2744', fontSize: '18px', fontWeight: 700 }}>
              {t.domainsTitle}
            </p>
          </td>
        </tr>

        {/* ===== DOMAIN CARDS ===== */}
        {updates.map((update, i) => {
          const colors = STATUS_STYLES[update.status] || STATUS_STYLES.ongoing;
          const isEven = i % 2 === 0;

          return (
            <tr key={update.url}>
              <td style={{ padding: '0 40px 20px' }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    backgroundColor: isEven ? '#f8fafc' : '#ffffff',
                    borderRadius: '10px',
                    overflow: 'hidden' as const,
                    ...(isEven
                      ? { borderLeft: `4px solid ${colors.cardBorder}` }
                      : {
                          border: '1px solid #e2e8f0',
                          borderLeft: `4px solid ${colors.cardBorder}`,
                        }),
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: '20px 22px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: colors.badgeBg,
                            color: colors.badgeText,
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            border: `1px solid ${colors.badgeBorder}`,
                          }}
                        >
                          {t.statusLabels[update.status] || update.status}
                        </span>
                        <p
                          style={{
                            margin: '8px 0 8px',
                            color: '#1a2744',
                            fontSize: '17px',
                            fontWeight: 700,
                            lineHeight: '1.35',
                          }}
                        >
                          {update.title}
                        </p>
                        <p
                          style={{
                            margin: '0 0 12px',
                            color: '#475569',
                            fontSize: '14px',
                            lineHeight: '1.55',
                          }}
                        >
                          {update.summary}
                        </p>
                        <Link
                          href={update.url}
                          style={{
                            color: '#2563eb',
                            fontSize: '14px',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          {t.readMore}
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          );
        })}

        {/* ===== DIVIDER ===== */}
        <tr>
          <td style={{ padding: '8px 40px 0' }}>
            <div style={{ borderTop: '1px solid #e2e8f0', height: 0 }} />
          </td>
        </tr>

        {/* ===== CLOSING NOTE / MOT DU FONDATEUR ===== */}
        {closingNote && (
          <tr>
            <td style={{ padding: '24px 40px 0' }}>
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                style={{
                  backgroundColor: '#fffbeb',
                  borderRadius: '10px',
                  borderLeft: '4px solid #d97706',
                  overflow: 'hidden' as const,
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ padding: '22px 24px' }}>
                      <p
                        style={{
                          margin: '0 0 16px',
                          color: '#78350f',
                          fontSize: '14px',
                          lineHeight: '1.6',
                        }}
                      >
                        {renderFormattedText(closingNote, {
                          color: '#78350f',
                          fontSize: '14px',
                          lineHeight: '1.6',
                        })}
                      </p>
                      <p style={{ margin: '0 0 2px', color: '#92400e', fontSize: '13px', fontWeight: 600 }}>
                        Zoltán Jánosi
                      </p>
                      <p style={{ margin: '0 0 1px', color: '#a16207', fontSize: '12px' }}>
                        {t.founderTitle}
                      </p>
                      <p style={{ margin: 0, color: '#a16207', fontSize: '11px', fontStyle: 'italic' as const }}>
                        {t.founderDesc}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {/* ===== FEEDBACK ===== */}
        {feedbackYesUrl && feedbackNoUrl && (
          <tr>
            <td style={{ padding: '32px 40px 0' }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '24px',
                        textAlign: 'center' as const,
                      }}
                    >
                      <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '14px', fontWeight: 500 }}>
                        {t.feedbackQuestion}
                      </p>
                      <table
                        role="presentation"
                        cellPadding={0}
                        cellSpacing={0}
                        style={{ margin: '0 auto' }}
                      >
                        <tbody>
                          <tr>
                            <td style={{ paddingRight: '10px' }}>
                              <Link
                                href={feedbackYesUrl}
                                style={{
                                  display: 'inline-block',
                                  padding: '8px 20px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '20px',
                                  color: '#334155',
                                  fontSize: '14px',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                }}
                              >
                                {t.feedbackYes}
                              </Link>
                            </td>
                            <td>
                              <Link
                                href={feedbackNoUrl}
                                style={{
                                  display: 'inline-block',
                                  padding: '8px 20px',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '20px',
                                  color: '#334155',
                                  fontSize: '14px',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                }}
                              >
                                {t.feedbackNo}
                              </Link>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <p style={{ margin: '14px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                        {t.feedbackMissing}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {/* ===== FOOTER ===== */}
        <tr>
          <td style={{ padding: '32px 40px 36px' }}>
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '20px',
                      textAlign: 'center' as const,
                    }}
                  >
                    <p style={{ margin: '0 0 8px' }}>
                      <Link
                        href={unsubscribeUrl}
                        style={{ color: '#64748b', fontSize: '12px', textDecoration: 'underline' }}
                      >
                        {t.managePrefs}
                      </Link>
                      <span style={{ color: '#cbd5e1', padding: '0 8px' }}>|</span>
                      <Link
                        href={unsubscribeUrl}
                        style={{ color: '#64748b', fontSize: '12px', textDecoration: 'underline' }}
                      >
                        {t.unsubscribe}
                      </Link>
                    </p>
                    <p style={{ margin: '0 0 4px', color: '#94a3b8', fontSize: '11px' }}>
                      {t.brand} —{' '}
                      <Link href={siteUrl} style={{ color: '#94a3b8', textDecoration: 'none' }}>
                        governance.brussels
                      </Link>
                    </p>
                    <p style={{ margin: '0 0 4px', color: '#cbd5e1', fontSize: '11px' }}>
                      {t.entity}
                    </p>
                    <p style={{ margin: 0, color: '#cbd5e1', fontSize: '11px' }}>
                      {t.disclaimer}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Full digest email — wraps DigestContent in Html/Head/Body.
 * Used directly by sending routes (approve, test-send, etc.).
 */
export default function DigestEmail(props: DigestEmailProps) {
  const t = T[props.locale] || T.fr;
  return (
    <Html lang={props.locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body
        style={{
          margin: '0',
          padding: '0',
          backgroundColor: '#eef1f6',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          WebkitTextSizeAdjust: '100%',
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: '#eef1f6' }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: '32px 16px' }}>
                <DigestContent {...props} />
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}
