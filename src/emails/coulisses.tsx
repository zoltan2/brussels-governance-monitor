// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Les coulisses de BGM » : mail personnel mensuel, sobre.
 *
 * Le texte vient de l'admin (éditeur Tiptap, jamais du dépôt) en HTML,
 * nettoyé par src/lib/coulisses/corps.ts. Le gabarit ajoute :
 * - pour un abonné en allemand, une note en tête : il reçoit la version
 *   anglaise (décision de Zoltán, 3 novembre 2026) ;
 * - sous le texte, une ligne de signature : LinkedIn et chaîne WhatsApp ;
 * - pour un premier mot reçu, un P.-S. qui propose de refuser ces messages en
 *   gardant le digest et ses thèmes ;
 * - dans TOUS les numéros, la ligne de pied de page et le lien vers les
 *   préférences, le même que dans le pied de page du digest.
 *
 * Pas de version texte écrite ici : sans champ `text`, Resend la tire du HTML.
 *
 * Changer ce fichier : changer aussi VERSION_GABARIT (src/lib/coulisses/journal.ts),
 * pour qu'un essai fait sur l'ancien gabarit ne vaille plus.
 */
import { Body, Container, Head, Html, Link, Preview, Text, Hr, Section } from '@react-email/components';
import type { LangueEnvoi, Variante } from '@/lib/coulisses/selection';
import { htmlPourMail, texteSeul } from '@/lib/coulisses/corps';
import { getWhatsappChannel } from '@/lib/whatsapp-channel';

export const LINKEDIN_URL = 'https://www.linkedin.com/in/zoltan';

interface Fixe {
  ps: string;
  psLien: string;
  pied: string;
  piedLien: string;
  whatsapp: string;
}

export const TEXTES_FIXES: Record<LangueEnvoi, Fixe> = {
  fr: {
    ps: "P.-S. Ces nouvelles vous arriveront une fois par mois. Si vous préférez vous en passer, décochez « Les coulisses de BGM » dans vos préférences : votre digest et vos thèmes ne changent pas.",
    psLien: 'Ouvrir mes préférences',
    pied: 'Vous recevez ces nouvelles en tant qu’abonné au digest de Brussels Governance Monitor.',
    piedLien: 'Gérer mes préférences',
    whatsapp: 'Chaîne WhatsApp',
  },
  nl: {
    ps: 'P.S. Dit nieuws ontvangt u één keer per maand. Liever niet? Vink « Achter de schermen bij BGM » uit in uw voorkeuren: uw digest en uw thema’s blijven ongewijzigd.',
    psLien: 'Mijn voorkeuren openen',
    pied: 'U ontvangt dit nieuws als abonnee van de digest van Brussels Governance Monitor.',
    piedLien: 'Mijn voorkeuren beheren',
    whatsapp: 'WhatsApp-kanaal',
  },
  en: {
    ps: 'P.S. This news will reach you once a month. If you would rather do without it, untick « Behind the scenes at BGM » in your preferences: your digest and your topics stay the same.',
    psLien: 'Open my preferences',
    pied: 'You receive this news as a subscriber to the Brussels Governance Monitor digest.',
    piedLien: 'Manage my preferences',
    whatsapp: 'WhatsApp channel',
  },
};

/** En tête du mail pour un abonné en allemand, qui reçoit la version anglaise. */
export const NOTE_GERMANOPHONES =
  'Es tut mir leid, dass ich Ihnen diese Nachrichten nicht auf Deutsch schreiben kann. Als Abonnentin oder Abonnent der deutschen Fassung erhalten Sie sie deshalb auf Englisch.';

export interface CoulissesEmailProps {
  langue: LangueEnvoi;
  variante: Variante;
  /** Corps en HTML (éditeur) ; un ancien texte brut est converti. */
  corps: string;
  /** Texte d'aperçu dans la boîte de réception ; à défaut, le début du texte. */
  apercu?: string;
  /** Abonné en allemand : note en tête. */
  germanophone?: boolean;
  /** Page de préférences de l'abonné, avec son jeton. */
  preferencesUrl: string;
}

export function lienCoulisses(preferencesUrl: string): string {
  return `${preferencesUrl}#coulisses`;
}

/** Aperçu choisi, sinon les 150 premiers caractères du texte. */
export function texteApercu(corps: string, apercu?: string): string {
  const choisi = apercu?.trim();
  if (choisi) return choisi;
  const t = texteSeul(htmlPourMail(corps));
  return t.length > 150 ? `${t.slice(0, 149).trimEnd()}…` : t;
}

export default function CoulissesEmail({ langue, variante, corps, apercu, germanophone, preferencesUrl }: CoulissesEmailProps) {
  const f = TEXTES_FIXES[langue];
  const whatsapp = getWhatsappChannel(langue);
  return (
    <Html lang={germanophone ? 'en' : langue}>
      <Head />
      <Preview>{texteApercu(corps, apercu)}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {germanophone && (
            <Text lang="de" style={styles.note}>
              {NOTE_GERMANOPHONES}
            </Text>
          )}
          <Section>
            <div dangerouslySetInnerHTML={{ __html: htmlPourMail(corps) }} />
          </Section>
          <Text style={styles.signature}>
            <Link href={LINKEDIN_URL} style={styles.link}>
              LinkedIn
            </Link>
            {whatsapp && (
              <>
                {' · '}
                <Link href={whatsapp.url} style={styles.link}>
                  {f.whatsapp}
                </Link>
              </>
            )}
          </Text>
          {variante === 'premier' && (
            <Text style={styles.text}>
              {f.ps}{' '}
              <Link href={lienCoulisses(preferencesUrl)} style={styles.link}>
                {f.psLien}
              </Link>
            </Text>
          )}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            {f.pied}{' '}
            <Link href={preferencesUrl} style={styles.footerLink}>
              {f.piedLien}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', margin: '0', padding: '0' },
  container: { margin: '24px auto', maxWidth: '560px', padding: '0 20px' },
  text: { color: '#1f2937', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' },
  note: { color: '#334155', fontSize: '14px', lineHeight: '1.5', fontStyle: 'italic', margin: '0 0 20px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' },
  signature: { color: '#4b5563', fontSize: '14px', lineHeight: '1.5', margin: '0 0 20px' },
  link: { color: '#1e3a5f', textDecoration: 'underline' },
  hr: { borderColor: '#e5e7eb', margin: '28px 0 12px' },
  footer: { color: '#4b5563', fontSize: '12px', lineHeight: '1.5', margin: '0', fontFamily: 'Arial, sans-serif' },
  footerLink: { color: '#4b5563', textDecoration: 'underline' },
};
