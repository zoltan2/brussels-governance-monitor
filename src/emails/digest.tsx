// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

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
  section: 'domains' | 'dossiers' | 'sectors' | 'communes';
  status?: 'blocked' | 'delayed' | 'ongoing' | 'resolved';
  phase?: 'announced' | 'planned' | 'in-progress' | 'stalled' | 'completed' | 'cancelled';
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
  magazineUrl?: string;
}

const STATUS_STYLES = {
  blocked: { badgeBg: '#f1f5f9', badgeText: '#334155', badgeBorder: '#94a3b8', cardBorder: '#64748b' },
  delayed: { badgeBg: '#fef3c7', badgeText: '#92400e', badgeBorder: '#fbbf24', cardBorder: '#e67e22' },
  ongoing: { badgeBg: '#eff6ff', badgeText: '#1e40af', badgeBorder: '#93c5fd', cardBorder: '#2563eb' },
  resolved: { badgeBg: '#f0fdfa', badgeText: '#115e59', badgeBorder: '#14b8a6', cardBorder: '#0d9488' },
} as const;

const PHASE_STYLES: Record<string, { badgeBg: string; badgeText: string; badgeBorder: string; cardBorder: string }> = {
  announced: { badgeBg: '#eff6ff', badgeText: '#1e40af', badgeBorder: '#93c5fd', cardBorder: '#2563eb' },
  planned: { badgeBg: '#eff6ff', badgeText: '#1e40af', badgeBorder: '#93c5fd', cardBorder: '#2563eb' },
  'in-progress': { badgeBg: '#eff6ff', badgeText: '#1e40af', badgeBorder: '#93c5fd', cardBorder: '#2563eb' },
  stalled: { badgeBg: '#fef3c7', badgeText: '#92400e', badgeBorder: '#fbbf24', cardBorder: '#e67e22' },
  completed: { badgeBg: '#f0fdfa', badgeText: '#115e59', badgeBorder: '#14b8a6', cardBorder: '#0d9488' },
  cancelled: { badgeBg: '#f1f5f9', badgeText: '#334155', badgeBorder: '#94a3b8', cardBorder: '#64748b' },
};

export const DARK_MODE_STYLE = `
@media (prefers-color-scheme: dark) {
  .bgm-bg-page { background-color: #0f172a !important; }
  .bgm-bg-card { background-color: #1e293b !important; }
  .bgm-bg-section { background-color: #1e293b !important; background-image: none !important; }
  .bgm-bg-row-alt { background-color: #0f172a !important; }
  .bgm-bg-closing { background-color: #3a2e1f !important; }
  .bgm-text-strong { color: #f1f5f9 !important; }
  .bgm-text-body { color: #cbd5e1 !important; }
  .bgm-text-mute { color: #94a3b8 !important; }
  .bgm-text-link { color: #93c5fd !important; }
  .bgm-text-closing-strong { color: #fde68a !important; }
  .bgm-text-closing-mute { color: #fbbf24 !important; }
}
[data-ogsc] .bgm-bg-page { background-color: #0f172a !important; }
[data-ogsc] .bgm-bg-card { background-color: #1e293b !important; }
[data-ogsc] .bgm-bg-section { background-color: #1e293b !important; background-image: none !important; }
[data-ogsc] .bgm-bg-row-alt { background-color: #0f172a !important; }
[data-ogsc] .bgm-bg-closing { background-color: #3a2e1f !important; }
[data-ogsc] .bgm-text-strong { color: #f1f5f9 !important; }
[data-ogsc] .bgm-text-body { color: #cbd5e1 !important; }
[data-ogsc] .bgm-text-mute { color: #94a3b8 !important; }
[data-ogsc] .bgm-text-link { color: #93c5fd !important; }
[data-ogsc] .bgm-text-closing-strong { color: #fde68a !important; }
[data-ogsc] .bgm-text-closing-mute { color: #fbbf24 !important; }
`;

const NEUTRAL_STYLE = { badgeBg: '#f1f5f9', badgeText: '#334155', badgeBorder: '#94a3b8', cardBorder: '#64748b' };

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
  dossiersTitle: string;
  sectorsTitle: string;
  communesTitle: string;
  readMore: string;
  founderTitle: string;
  founderDesc: string;
  quizTeaser: string;
  quizCta: string;
  quizDesc: string;
  magazineLabel: string;
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
  phaseLabels: Record<string, string>;
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
    dossiersTitle: 'Dossiers mis à jour',
    sectorsTitle: 'Secteurs mis à jour',
    communesTitle: 'Communes mises à jour',
    readMore: 'Lire la fiche →',
    founderTitle: 'Fondateur Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    quizTeaser: 'Connaissez-vous vraiment Bruxelles ?',
    quizCta: 'Testez vos connaissances',
    quizDesc: '10 questions sur la gouvernance bruxelloise — un nouveau quiz chaque semaine.',
    magazineLabel: 'Lire en version magazine \u2192',
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
    phaseLabels: { announced: 'Annoncé', planned: 'Planifié', 'in-progress': 'En cours', stalled: 'Bloqué', completed: 'Terminé', cancelled: 'Annulé' },
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
    dossiersTitle: 'Bijgewerkte dossiers',
    sectorsTitle: 'Bijgewerkte sectoren',
    communesTitle: 'Bijgewerkte gemeenten',
    readMore: 'Lees de fiche →',
    founderTitle: 'Oprichter Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    quizTeaser: 'Kent u Brussel echt?',
    quizCta: 'Test uw kennis',
    quizDesc: '10 vragen over het Brusselse bestuur — elke week een nieuwe quiz.',
    magazineLabel: 'Lees de magazine-versie \u2192',
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
    phaseLabels: { announced: 'Aangekondigd', planned: 'Gepland', 'in-progress': 'Lopend', stalled: 'Geblokkeerd', completed: 'Voltooid', cancelled: 'Geannuleerd' },
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
    dossiersTitle: 'Updated dossiers',
    sectorsTitle: 'Updated sectors',
    communesTitle: 'Updated communes',
    readMore: 'Read more →',
    founderTitle: 'Founder, Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    quizTeaser: 'How well do you know Brussels?',
    quizCta: 'Test your knowledge',
    quizDesc: '10 questions on Brussels governance — a new quiz every week.',
    magazineLabel: 'Read the magazine edition \u2192',
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
    phaseLabels: { announced: 'Announced', planned: 'Planned', 'in-progress': 'In progress', stalled: 'Stalled', completed: 'Completed', cancelled: 'Cancelled' },
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
    dossiersTitle: 'Aktualisierte Dossiers',
    sectorsTitle: 'Aktualisierte Sektoren',
    communesTitle: 'Aktualisierte Gemeinden',
    readMore: 'Weiterlesen →',
    founderTitle: 'Gründer, Brussels Governance Monitor',
    founderDesc: 'Brussels-based business developer & Digital Strategy Advisor',
    quizTeaser: 'Kennen Sie Brüssel wirklich?',
    quizCta: 'Testen Sie Ihr Wissen',
    quizDesc: '10 Fragen zur Brüsseler Governance — jede Woche ein neues Quiz.',
    magazineLabel: 'Magazine-Version lesen \u2192',
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
    phaseLabels: { announced: 'Angekündigt', planned: 'Geplant', 'in-progress': 'Laufend', stalled: 'Blockiert', completed: 'Abgeschlossen', cancelled: 'Abgesagt' },
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
  magazineUrl,
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
    ...(magazineUrl ? [`${t.magazineLabel} ${magazineUrl}`, ''] : []),
    `${t.commitmentsTitle}: ${commitmentCount} ${t.commitmentsDesc}`,
    `${siteUrl}/${locale}/${t.commitmentsLink}?utm_source=bgm-digest&utm_medium=email&utm_campaign=weekly&utm_content=commitments`,
    '',
    '---',
    '',
    '',
  ];

  const sectionOrder: Array<{ key: DigestUpdate['section']; title: string }> = [
    { key: 'domains', title: t.domainsTitle },
    { key: 'dossiers', title: t.dossiersTitle },
    { key: 'sectors', title: t.sectorsTitle },
    { key: 'communes', title: t.communesTitle },
  ];

  for (const { key, title } of sectionOrder) {
    const sectionUpdates = updates.filter((u) => u.section === key);
    if (sectionUpdates.length === 0) continue;

    lines.push(title);
    lines.push('');

    for (const update of sectionUpdates) {
      const badgeLabel = update.status
        ? (t.statusLabels[update.status] || update.status)
        : update.phase
          ? (t.phaseLabels[update.phase] || update.phase)
          : '';
      lines.push(badgeLabel ? `[${badgeLabel}] ${update.title}` : update.title);
      lines.push(update.summary);
      lines.push(`${t.readMore} ${update.url}`);
      lines.push('');
    }
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
  magazineUrl,
}: DigestEmailProps) {
  const t = T[locale] || T.fr;

  return (
    <table
      align="center"
      role="presentation"
      width="640"
      cellPadding={0}
      cellSpacing={0}
      className="bgm-bg-card"
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
                    <p style={{ margin: '12px 0 0' }}>
                      <Link
                        href={`${siteUrl}/${locale}/quiz?utm_source=bgm-digest&utm_medium=email&utm_campaign=quiz&utm_content=header-teaser`}
                        style={{
                          color: '#93c5fd',
                          fontSize: '13px',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        {t.quizTeaser} →
                      </Link>
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
              className="bgm-bg-section"
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
                      className="bgm-text-body"
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
              className="bgm-bg-section"
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
                      className="bgm-text-mute"
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
                      className="bgm-text-strong"
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
                    <p className="bgm-text-body" style={{ margin: '0 0 8px', color: '#334155', fontSize: '15px', fontWeight: 500 }}>
                      {weeklyNumber.label}
                    </p>
                    <p className="bgm-text-mute" style={{ margin: 0, color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' as const }}>
                      {weeklyNumber.source}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        {/* ===== MAGAZINE BUTTON (conditional) ===== */}
        {magazineUrl ? (
          <tr>
            <td style={{ padding: '16px 40px 0', textAlign: 'center' as const }}>
              <Button
                href={magazineUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                }}
              >
                {t.magazineLabel}
              </Button>
            </td>
          </tr>
        ) : null}

        {/* ===== COMMITMENTS ===== */}
        <tr>
          <td style={{ padding: '20px 40px 0' }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              className="bgm-bg-section"
              style={{ backgroundColor: '#eff6ff', borderRadius: '8px' }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '16px 20px' }}>
                    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                      <tbody>
                        <tr>
                          <td>
                            <p className="bgm-text-strong" style={{ margin: '0 0 2px', color: '#1e40af', fontSize: '15px', fontWeight: 600 }}>
                              {t.commitmentsTitle}
                            </p>
                            <p className="bgm-text-body" style={{ margin: 0, color: '#475569', fontSize: '13px' }}>
                              {commitmentCount} {t.commitmentsDesc}
                            </p>
                          </td>
                          <td style={{ textAlign: 'right' as const, verticalAlign: 'middle' as const }}>
                            <Button
                              href={`${siteUrl}/${locale}/${t.commitmentsLink}?utm_source=bgm-digest&utm_medium=email&utm_campaign=weekly&utm_content=commitments`}
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

        {/* ===== CONTENT SECTIONS ===== */}
        {(['domains', 'dossiers', 'sectors', 'communes'] as const).map((sectionKey) => {
          const sectionUpdates = updates.filter((u) => u.section === sectionKey);
          if (sectionUpdates.length === 0) return null;

          const sectionTitleMap = {
            domains: t.domainsTitle,
            dossiers: t.dossiersTitle,
            sectors: t.sectorsTitle,
            communes: t.communesTitle,
          };

          return [
            <tr key={`title-${sectionKey}`}>
              <td style={{ padding: '24px 40px 20px' }}>
                <p className="bgm-text-strong" style={{ margin: 0, color: '#1a2744', fontSize: '18px', fontWeight: 700 }}>
                  {sectionTitleMap[sectionKey]}
                </p>
              </td>
            </tr>,
            ...sectionUpdates.map((update, i) => {
              const colors = update.status
                ? (STATUS_STYLES[update.status] || STATUS_STYLES.ongoing)
                : update.phase
                  ? (PHASE_STYLES[update.phase] || NEUTRAL_STYLE)
                  : NEUTRAL_STYLE;

              const badgeLabel = update.status
                ? (t.statusLabels[update.status] || update.status)
                : update.phase
                  ? (t.phaseLabels[update.phase] || update.phase)
                  : null;

              const isEven = i % 2 === 0;

              return (
                <tr key={update.url}>
                  <td style={{ padding: '0 40px 20px' }}>
                    <table
                      role="presentation"
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      className={isEven ? 'bgm-bg-row-alt' : 'bgm-bg-card'}
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
                            {badgeLabel && (
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
                                {badgeLabel}
                              </span>
                            )}
                            <p
                              className="bgm-text-strong"
                              style={{
                                margin: badgeLabel ? '8px 0 8px' : '0 0 8px',
                                color: '#1a2744',
                                fontSize: '17px',
                                fontWeight: 700,
                                lineHeight: '1.35',
                              }}
                            >
                              {update.title}
                            </p>
                            <p
                              className="bgm-text-body"
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
                              className="bgm-text-link"
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
            }),
          ];
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
                className="bgm-bg-closing"
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
                        className="bgm-text-closing-strong"
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
                      <p className="bgm-text-closing-strong" style={{ margin: '0 0 2px', color: '#92400e', fontSize: '13px', fontWeight: 600 }}>
                        Zoltán Jánosi
                      </p>
                      <p className="bgm-text-closing-mute" style={{ margin: '0 0 1px', color: '#a16207', fontSize: '12px' }}>
                        {t.founderTitle}
                      </p>
                      <p className="bgm-text-closing-mute" style={{ margin: 0, color: '#a16207', fontSize: '11px', fontStyle: 'italic' as const }}>
                        {t.founderDesc}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        )}

        {/* ===== QUIZ CTA ===== */}
        <tr>
          <td style={{ padding: '28px 40px 0' }}>
            <table
              role="presentation"
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              className="bgm-bg-section"
              style={{
                backgroundColor: '#f0f4f8',
                borderRadius: '10px',
                overflow: 'hidden' as const,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '20px 24px', textAlign: 'center' as const }}>
                    <p className="bgm-text-strong" style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '15px', fontWeight: 600 }}>
                      {t.quizTeaser}
                    </p>
                    <p className="bgm-text-mute" style={{ margin: '0 0 14px', color: '#64748b', fontSize: '13px' }}>
                      {t.quizDesc}
                    </p>
                    <Link
                      href={`${siteUrl}/${locale}/quiz?utm_source=bgm-digest&utm_medium=email&utm_campaign=quiz&utm_content=bottom-cta`}
                      style={{
                        display: 'inline-block',
                        padding: '10px 24px',
                        backgroundColor: '#1e3a5f',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      {t.quizCta} →
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

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
                      <p className="bgm-text-body" style={{ margin: '0 0 14px', color: '#475569', fontSize: '14px', fontWeight: 500 }}>
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
                      <p className="bgm-text-mute" style={{ margin: '14px 0 0', color: '#94a3b8', fontSize: '13px' }}>
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
                        className="bgm-text-mute"
                        style={{ color: '#64748b', fontSize: '12px', textDecoration: 'underline' }}
                      >
                        {t.managePrefs}
                      </Link>
                      <span className="bgm-text-mute" style={{ color: '#cbd5e1', padding: '0 8px' }}>|</span>
                      <Link
                        href={unsubscribeUrl}
                        className="bgm-text-mute"
                        style={{ color: '#64748b', fontSize: '12px', textDecoration: 'underline' }}
                      >
                        {t.unsubscribe}
                      </Link>
                    </p>
                    <p className="bgm-text-mute" style={{ margin: '0 0 4px', color: '#94a3b8', fontSize: '11px' }}>
                      {t.brand} —{' '}
                      <Link href={siteUrl} className="bgm-text-mute" style={{ color: '#94a3b8', textDecoration: 'none' }}>
                        governance.brussels
                      </Link>
                    </p>
                    <p className="bgm-text-mute" style={{ margin: '0 0 4px', color: '#cbd5e1', fontSize: '11px' }}>
                      {t.entity}
                    </p>
                    <p className="bgm-text-mute" style={{ margin: 0, color: '#cbd5e1', fontSize: '11px' }}>
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
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: DARK_MODE_STYLE }} />
      </Head>
      <Preview>{t.preview}</Preview>
      <Body
        className="bgm-bg-page"
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
          className="bgm-bg-page"
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
