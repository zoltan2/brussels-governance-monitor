import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';

interface GoodbyeEmailProps {
  locale: string;
  siteUrl: string;
}

const translations: Record<string, {
  preview: string;
  title: string;
  message: string;
  thanks: string;
  resubscribe: string;
  visitSite: string;
  footer: string;
  disclaimer: string;
}> = {
  fr: {
    preview: 'Votre désinscription est confirmée',
    title: 'Désinscription confirmée',
    message:
      'Vous ne recevrez plus d\'emails de Brussels Governance Monitor. Votre demande sera traitée dans les 30 jours conformément au RGPD.',
    thanks:
      'Merci d\'avoir suivi l\'actualité de la gouvernance bruxelloise avec nous.',
    resubscribe: 'Si vous changez d\'avis, vous pouvez vous réinscrire à tout moment sur notre site.',
    visitSite: 'Visiter le site',
    footer:
      'Brussels Governance Monitor — Un projet d\'intérêt général hébergé par Advice That SRL',
    disclaimer: 'Non affilié à aucun parti politique',
  },
  nl: {
    preview: 'Uw uitschrijving is bevestigd',
    title: 'Uitschrijving bevestigd',
    message:
      'U ontvangt geen e-mails meer van Brussels Governance Monitor. Uw verzoek wordt binnen 30 dagen verwerkt conform de AVG.',
    thanks:
      'Bedankt dat u het nieuws over het Brusselse bestuur met ons hebt gevolgd.',
    resubscribe: 'Als u van gedachten verandert, kunt u zich op elk moment opnieuw inschrijven op onze website.',
    visitSite: 'Bezoek de website',
    footer:
      'Brussels Governance Monitor — Een project van algemeen belang gehost door Advice That SRL',
    disclaimer: 'Niet gelieerd aan enige politieke partij',
  },
  en: {
    preview: 'Your unsubscription is confirmed',
    title: 'Unsubscription confirmed',
    message:
      'You will no longer receive emails from Brussels Governance Monitor. Your request will be processed within 30 days in accordance with the GDPR.',
    thanks:
      'Thank you for following Brussels governance news with us.',
    resubscribe: 'If you change your mind, you can resubscribe at any time on our website.',
    visitSite: 'Visit the website',
    footer:
      'Brussels Governance Monitor — A public interest project hosted by Advice That SRL',
    disclaimer: 'Not affiliated with any political party',
  },
  de: {
    preview: 'Ihre Abmeldung ist bestätigt',
    title: 'Abmeldung bestätigt',
    message:
      'Sie erhalten keine E-Mails mehr von Brussels Governance Monitor. Ihr Antrag wird innerhalb von 30 Tagen gemäß der DSGVO bearbeitet.',
    thanks:
      'Vielen Dank, dass Sie die Nachrichten zur Brüsseler Verwaltung mit uns verfolgt haben.',
    resubscribe: 'Wenn Sie Ihre Meinung ändern, können Sie sich jederzeit erneut auf unserer Website anmelden.',
    visitSite: 'Website besuchen',
    footer:
      'Brussels Governance Monitor — Ein Projekt im öffentlichen Interesse, gehostet von Advice That SRL',
    disclaimer: 'Keiner politischen Partei angeschlossen',
  },
};

export default function GoodbyeEmail({ locale, siteUrl }: GoodbyeEmailProps) {
  const t = translations[locale] || translations.fr;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{t.title}</Heading>

          <Text style={styles.text}>{t.message}</Text>
          <Text style={styles.text}>{t.thanks}</Text>
          <Text style={styles.text}>{t.resubscribe}</Text>

          <Link href={siteUrl} style={styles.siteLink}>
            {t.visitSite}
          </Link>

          <Hr style={styles.hr} />

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
  siteLink: {
    color: '#1a1f35',
    display: 'inline-block' as const,
    fontSize: '14px',
    margin: '8px 0 0',
    textDecoration: 'underline',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
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
