// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * « Les coulisses de BGM » : mail personnel mensuel, presque en texte brut.
 *
 * Le texte vient de l'admin (jamais du dépôt). Le gabarit n'ajoute que :
 * - pour un premier mot reçu, un P.-S. qui propose de refuser ces messages en
 *   gardant le digest et ses thèmes (décision de Zoltán, 3 novembre 2026) ;
 * - dans TOUS les numéros, la ligne de pied de page et le lien vers les
 *   préférences, le même que dans le pied de page du digest.
 *
 * Changer ce fichier : changer aussi VERSION_GABARIT (src/lib/coulisses/journal.ts),
 * pour qu'un essai fait sur l'ancien gabarit ne vaille plus.
 */
import { Body, Container, Head, Html, Link, Preview, Text, Hr } from '@react-email/components';
import type { LangueEnvoi, Variante } from '@/lib/coulisses/selection';

interface Fixe {
  ps: string;
  psLien: string;
  pied: string;
  piedLien: string;
}

export const TEXTES_FIXES: Record<LangueEnvoi, Fixe> = {
  fr: {
    ps: "P.-S. Ces quelques lignes viendront une fois par mois au plus. Si vous préférez vous en passer, décochez « Les coulisses de BGM » dans vos préférences : votre digest et vos thèmes ne changent pas.",
    psLien: 'Ouvrir mes préférences',
    pied: 'Vous recevez ces nouvelles en tant qu’abonné au digest de Brussels Governance Monitor.',
    piedLien: 'Gérer mes préférences',
  },
  nl: {
    ps: 'P.S. Deze paar regels komen hoogstens één keer per maand. Liever niet? Vink « Achter de schermen bij BGM » uit in uw voorkeuren: uw digest en uw thema’s blijven ongewijzigd.',
    psLien: 'Mijn voorkeuren openen',
    pied: 'U ontvangt dit nieuws als abonnee van de digest van Brussels Governance Monitor.',
    piedLien: 'Mijn voorkeuren beheren',
  },
  en: {
    ps: 'P.S. These few lines will come once a month at most. If you would rather do without them, untick « Behind the scenes at BGM » in your preferences: your digest and your topics stay the same.',
    psLien: 'Open my preferences',
    pied: 'You receive this news as a subscriber to the Brussels Governance Monitor digest.',
    piedLien: 'Manage my preferences',
  },
};

export interface CoulissesEmailProps {
  langue: LangueEnvoi;
  variante: Variante;
  corps: string;
  /** Page de préférences de l'abonné, avec son jeton. */
  preferencesUrl: string;
}

/** Paragraphes séparés par une ligne vide ; les retours simples sont gardés. */
export function paragraphes(corps: string): string[] {
  return corps
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function lienCoulisses(preferencesUrl: string): string {
  return `${preferencesUrl}#coulisses`;
}

export function texteBrutCoulisses({ langue, variante, corps, preferencesUrl }: CoulissesEmailProps): string {
  const f = TEXTES_FIXES[langue];
  const lignes = [...paragraphes(corps)];
  if (variante === 'premier') lignes.push(`${f.ps}\n${f.psLien} : ${lienCoulisses(preferencesUrl)}`);
  lignes.push(`--\n${f.pied}\n${f.piedLien} : ${preferencesUrl}`);
  return lignes.join('\n\n') + '\n';
}

export default function CoulissesEmail({ langue, variante, corps, preferencesUrl }: CoulissesEmailProps) {
  const f = TEXTES_FIXES[langue];
  const ps = paragraphes(corps);
  return (
    <Html lang={langue}>
      <Head />
      <Preview>{ps[0] ?? ''}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {ps.map((p, i) => (
            <Text key={i} style={styles.text}>
              {p.split('\n').map((ligne, j, tout) => (
                <span key={j}>
                  {ligne}
                  {j < tout.length - 1 ? <br /> : null}
                </span>
              ))}
            </Text>
          ))}
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
  link: { color: '#1e3a5f', textDecoration: 'underline' },
  hr: { borderColor: '#e5e7eb', margin: '28px 0 12px' },
  footer: { color: '#4b5563', fontSize: '12px', lineHeight: '1.5', margin: '0', fontFamily: 'Arial, sans-serif' },
  footerLink: { color: '#4b5563', textDecoration: 'underline' },
};
