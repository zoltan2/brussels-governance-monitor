import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import DigestEmail, { type DigestEmailProps } from './digest';

interface DigestPreviewEmailProps extends DigestEmailProps {
  approveUrl: string;
  editUrl: string;
  subscriberCount: number;
}

export default function DigestPreviewEmail({
  approveUrl,
  editUrl,
  subscriberCount,
  ...digestProps
}: DigestPreviewEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>PREVIEW — Digest à approuver avant lundi 8h</Preview>
      <Body style={styles.body}>
        {/* Preview banner */}
        <Container style={styles.banner}>
          <Text style={styles.bannerTitle}>PREVIEW</Text>
          <Text style={styles.bannerText}>
            Ce digest sera envoyé lundi 8h CET si vous approuvez.
          </Text>
          <Text style={styles.bannerSubscribers}>
            {subscriberCount} abonné{subscriberCount > 1 ? 's' : ''} recevront ce mail
            (filtré par thèmes suivis).
          </Text>
          <Section style={styles.bannerButtons}>
            <Link href={approveUrl} style={styles.approveButton}>
              Approuver l&apos;envoi
            </Link>
            <Link href={editUrl} style={styles.editButton}>
              Modifier
            </Link>
          </Section>
        </Container>

        {/* Render the actual digest */}
        <DigestEmail {...digestProps} />
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
  banner: {
    backgroundColor: '#fef3c7',
    borderBottom: '2px solid #f59e0b',
    margin: '0 auto',
    maxWidth: '520px',
    padding: '20px 32px',
    textAlign: 'center' as const,
  },
  bannerTitle: {
    color: '#92400e',
    fontSize: '18px',
    fontWeight: '700' as const,
    letterSpacing: '0.1em',
    margin: '0 0 8px',
  },
  bannerText: {
    color: '#78350f',
    fontSize: '14px',
    margin: '0 0 4px',
  },
  bannerSubscribers: {
    color: '#92400e',
    fontSize: '13px',
    margin: '0 0 16px',
  },
  bannerButtons: {
    textAlign: 'center' as const,
  },
  approveButton: {
    backgroundColor: '#1e3a5f',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'inline-block' as const,
    fontSize: '14px',
    fontWeight: '600' as const,
    padding: '10px 24px',
    textDecoration: 'none',
    marginRight: '12px',
  },
  editButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    color: '#374151',
    display: 'inline-block' as const,
    fontSize: '14px',
    fontWeight: '600' as const,
    padding: '10px 24px',
    textDecoration: 'none',
  },
};
