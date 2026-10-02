// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Email envoyé quand une adresse DÉJÀ abonnée renvoie un formulaire
// d'inscription. Le bouton porte un jeton de confirmation avec les sujets
// demandés : sans clic, rien ne change dans l'abonnement (02/10/2026).

import {
  Body,
  Button,
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

interface DejaAbonneEmailProps {
  locale: string;
  confirmUrl: string;
  preferencesUrl: string;
  topics: string[];
}

const translations: Record<string, {
  preview: string;
  title: string;
  text: string;
  topicsTitle: string;
  button: string;
  expiry: string;
  ignore: string;
  preferences: string;
  footer: string;
}> = {
  fr: {
    preview: 'Vous recevez déjà le digest : ajouter ces sujets à votre abonnement ?',
    title: 'Vous êtes déjà abonné',
    text:
      "Une demande d'inscription vient d'être faite avec cette adresse, qui reçoit déjà le digest de Brussels Governance Monitor. Pour ajouter les sujets ci-dessous à votre abonnement, cliquez sur le bouton. Sans clic, rien ne change.",
    topicsTitle: 'Sujets demandés :',
    button: 'Ajouter ces sujets',
    expiry: 'Ce lien expire dans 48 heures.',
    ignore:
      'Si cette demande ne vient pas de vous, ignorez cet email : votre abonnement reste inchangé.',
    preferences: 'Gérer mes préférences ou me désabonner',
    footer:
      "Brussels Governance Monitor, un projet d'intérêt général hébergé par Advice That SRL",
  },
  nl: {
    preview: 'U ontvangt de digest al: deze onderwerpen aan uw abonnement toevoegen?',
    title: 'U bent al geabonneerd',
    text:
      'Er is zonet een inschrijving aangevraagd met dit adres, dat de digest van Brussels Governance Monitor al ontvangt. Klik op de knop om de onderstaande onderwerpen aan uw abonnement toe te voegen. Zonder klik verandert er niets.',
    topicsTitle: 'Gevraagde onderwerpen:',
    button: 'Deze onderwerpen toevoegen',
    expiry: 'Deze link vervalt na 48 uur.',
    ignore:
      'Komt deze aanvraag niet van u, negeer dan deze e-mail: uw abonnement blijft ongewijzigd.',
    preferences: 'Mijn voorkeuren beheren of uitschrijven',
    footer:
      'Brussels Governance Monitor, een project van algemeen belang gehost door Advice That SRL',
  },
  en: {
    preview: 'You already receive the digest: add these topics to your subscription?',
    title: 'You are already subscribed',
    text:
      'A subscription request has just been made with this address, which already receives the Brussels Governance Monitor digest. To add the topics below to your subscription, click the button. Without a click, nothing changes.',
    topicsTitle: 'Requested topics:',
    button: 'Add these topics',
    expiry: 'This link expires in 48 hours.',
    ignore:
      'If this request did not come from you, ignore this email: your subscription stays unchanged.',
    preferences: 'Manage my preferences or unsubscribe',
    footer:
      'Brussels Governance Monitor, a public interest project hosted by Advice That SRL',
  },
  de: {
    preview: 'Sie erhalten den Digest bereits: diese Themen zu Ihrem Abonnement hinzufügen?',
    title: 'Sie sind bereits abonniert',
    text:
      'Mit dieser Adresse, die den Digest von Brussels Governance Monitor bereits erhält, wurde soeben eine Anmeldung angefragt. Um die folgenden Themen zu Ihrem Abonnement hinzuzufügen, klicken Sie auf die Schaltfläche. Ohne Klick ändert sich nichts.',
    topicsTitle: 'Angefragte Themen:',
    button: 'Diese Themen hinzufügen',
    expiry: 'Dieser Link läuft in 48 Stunden ab.',
    ignore:
      'Wenn diese Anfrage nicht von Ihnen stammt, ignorieren Sie diese E-Mail: Ihr Abonnement bleibt unverändert.',
    preferences: 'Meine Einstellungen verwalten oder abmelden',
    footer:
      'Brussels Governance Monitor, ein Projekt im öffentlichen Interesse, gehostet von Advice That SRL',
  },
};

export default function DejaAbonneEmail({
  locale,
  confirmUrl,
  preferencesUrl,
  topics,
}: DejaAbonneEmailProps) {
  const t = translations[locale] || translations.fr;
  const labels = getTopicLabels(locale);

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{t.title}</Heading>

          <Text style={styles.text}>{t.text}</Text>

          <Section style={styles.topicsSection}>
            <Text style={styles.topicsTitle}>{t.topicsTitle}</Text>
            {topics.map((topic) => (
              <Text key={topic} style={styles.topicItem}>
                {labels[topic] || topic}
              </Text>
            ))}
          </Section>

          <Button href={confirmUrl} style={styles.button}>
            {t.button}
          </Button>

          <Text style={styles.expiry}>{t.expiry}</Text>
          <Text style={styles.ignore}>{t.ignore}</Text>

          <Hr style={styles.hr} />

          <Link href={preferencesUrl} style={styles.preferencesLink}>
            {t.preferences}
          </Link>

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
  topicsSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    margin: '16px 0',
    padding: '12px 16px',
  },
  topicsTitle: {
    color: '#374151',
    fontSize: '13px',
    fontWeight: '600' as const,
    margin: '0 0 6px',
  },
  topicItem: {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0',
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
    color: '#6b7280',
    fontSize: '12px',
    margin: '0 0 16px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  preferencesLink: {
    color: '#374151',
    fontSize: '12px',
    textDecoration: 'underline',
  },
  footer: {
    color: '#6b7280',
    fontSize: '11px',
    lineHeight: '1.5',
    margin: '12px 0 0',
  },
};
