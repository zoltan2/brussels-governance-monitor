// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
//
// Digest email — REDESIGN (sub-chantier #2). Parallel to digest.tsx so production
// sending is untouched. Two ideas from the spec:
//  1. Rotating hero (A = chiffre / B = question / C = fait marquant) — storytelling
//     lives ONLY here, never per item.
//  2. Flat "tous égaux" body — no status hierarchy/colours; the subscriber chose
//     their topics, so every line carries equal weight. Compact rows.
//
// Resend + React Email, email-safe inline styles only.

import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components';

export type HeroVariant = 'number' | 'question' | 'fact';

export interface RedesignHero {
  variant: HeroVariant;
  /** number variant: the big figure (e.g. "400+"); question/fact: unused */
  value?: string;
  /** number variant: what the figure measures */
  valueLabel?: string;
  /** question variant: the question headline */
  question?: string;
  /** fact variant: the notable-fact headline */
  fact?: string;
  /** 1-2 sentence storytelling lead, shared by all variants */
  lead: string;
  /** eyebrow above the hero (e.g. "CETTE SEMAINE · CLIMAT") */
  eyebrow: string;
}

export interface RedesignItem {
  category: string; // eyebrow, e.g. "Propreté · Ville de Bruxelles"
  headline: string; // one-line scoop
  url: string;
}

export interface DigestRedesignProps {
  locale: string;
  weekOf: string;
  hero: RedesignHero;
  items: RedesignItem[];
  closingNote: string;
  magazineUrl?: string;
  siteUrl: string;
  unsubscribeUrl: string;
}

const C = {
  pageBg: '#eef1f6',
  card: '#ffffff',
  ink: '#0f172a',
  sub: '#475569',
  faint: '#94a3b8',
  line: '#e2e8f0',
  navy1: '#1a2744',
  navy2: '#1e3a5f',
  accent: '#8d4c00', // status-delayed-ish, AA on white
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function DigestRedesign({
  locale,
  weekOf,
  hero,
  items,
  closingNote,
  magazineUrl,
  siteUrl,
  unsubscribeUrl,
}: DigestRedesignProps) {
  const heroHeadline =
    hero.variant === 'number'
      ? null
      : hero.variant === 'question'
        ? hero.question
        : hero.fact;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{hero.variant === 'number' ? `${hero.value} — ${hero.valueLabel}` : heroHeadline || hero.lead}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: C.pageBg, fontFamily: FONT }}>
        <Container style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '32px 16px' }}>
          {/* Masthead */}
          <Section
            style={{
              background: `linear-gradient(135deg, ${C.navy1} 0%, ${C.navy2} 100%)`,
              borderRadius: '12px 12px 0 0',
              padding: '26px 36px',
            }}
          >
            <Text style={{ margin: 0, color: '#cdd8ea', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              Brussels Governance Monitor
            </Text>
            <Text style={{ margin: '2px 0 0', color: '#ffffff', fontSize: 15, fontWeight: 600 }}>
              {weekOf}
            </Text>
          </Section>

          {/* HERO — storytelling lives here only */}
          <Section style={{ backgroundColor: C.card, padding: '34px 36px 28px' }}>
            <Text style={{ margin: 0, color: C.accent, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>
              {hero.eyebrow}
            </Text>

            {hero.variant === 'number' ? (
              <>
                <Heading as="h1" style={{ margin: '10px 0 0', color: C.ink, fontSize: 56, lineHeight: '1', fontWeight: 800, letterSpacing: -1 }}>
                  {hero.value}
                </Heading>
                <Text style={{ margin: '6px 0 0', color: C.sub, fontSize: 15, lineHeight: '1.5' }}>
                  {hero.valueLabel}
                </Text>
              </>
            ) : (
              <Heading as="h1" style={{ margin: '10px 0 0', color: C.ink, fontSize: 26, lineHeight: '1.25', fontWeight: 800, letterSpacing: -0.4 }}>
                {heroHeadline}
              </Heading>
            )}

            <Text style={{ margin: '16px 0 0', color: C.ink, fontSize: 15, lineHeight: '1.65' }}>
              {hero.lead}
            </Text>
          </Section>

          {/* BODY — flat, all equal */}
          <Section style={{ backgroundColor: C.card, padding: '4px 36px 8px' }}>
            <Hr style={{ borderColor: C.line, margin: '0 0 4px' }} />
            {items.map((it, i) => (
              <Section key={i} style={{ padding: '14px 0', borderBottom: i < items.length - 1 ? `1px solid ${C.line}` : 'none' }}>
                <Text style={{ margin: 0, color: C.faint, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>
                  {it.category}
                </Text>
                <Text style={{ margin: '3px 0 0', fontSize: 15, lineHeight: '1.45' }}>
                  <Link href={it.url} style={{ color: C.ink, fontWeight: 600, textDecoration: 'none' }}>
                    {it.headline}
                  </Link>
                </Text>
              </Section>
            ))}
          </Section>

          {/* Magazine CTA */}
          {magazineUrl && (
            <Section style={{ backgroundColor: C.card, padding: '6px 36px 26px' }}>
              <Link
                href={magazineUrl}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  backgroundColor: C.navy1,
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '13px 18px',
                  borderRadius: 8,
                }}
              >
                Lire le magazine de la semaine →
              </Link>
            </Section>
          )}

          {/* Closing + footer */}
          <Section style={{ backgroundColor: C.card, borderRadius: '0 0 12px 12px', padding: '0 36px 30px' }}>
            <Hr style={{ borderColor: C.line, margin: '0 0 18px' }} />
            <Text style={{ margin: 0, color: C.sub, fontSize: 14, lineHeight: '1.6', fontStyle: 'italic' }}>
              {closingNote}
            </Text>
            <Text style={{ margin: '20px 0 0', color: C.faint, fontSize: 12, lineHeight: '1.6' }}>
              <Link href={siteUrl} style={{ color: C.faint, textDecoration: 'underline' }}>governance.brussels</Link>
              {'  ·  '}
              <Link href={unsubscribeUrl} style={{ color: C.faint, textDecoration: 'underline' }}>se désabonner</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DigestRedesign;
