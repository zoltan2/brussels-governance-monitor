// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { render } from '@react-email/components';
import DigestEmail, { generateDigestPlainText, type DigestEmailProps } from '@/emails/digest';
import { encartSondageDigest } from './encart-digest';

const SITE = 'https://governance.brussels';
const CAMPAGNE = { ouverture: '2026-09-30', cloture: '2026-12-06' };
const LUNDI = new Date('2026-10-05T06:00:00Z');

describe('encart du sondage dans le digest', () => {
  it('fr et nl pointent chacun vers leur page, avec le suivi de la campagne', () => {
    const fr = encartSondageDigest('fr', SITE, LUNDI, CAMPAGNE)!;
    expect(fr.url).toBe(
      `${SITE}/fr/sondage?utm_source=bgm-digest&utm_medium=email&utm_campaign=sondage&utm_content=encart-haut`,
    );
    expect(fr.texte).toContain('jusqu\'au 6 décembre');
    // Libellé arrêté par Zoltán le 09/10/2026 : le titre interroge le lecteur et
    // le texte dit à quoi servent les réponses. Ni podcast, ni phrase sur les critiques.
    expect(fr.titre).toBe('Que faut-il changer au digest ?');
    expect(fr.texte).toBe(
      'Dix questions, anonyme, jusqu\'au 6 décembre. Vos réponses décident de la suite. Résultats dans le digest du 14 décembre.',
    );
    expect(fr.titre + fr.texte).not.toMatch(/podcast|critiques/i);
    const nl = encartSondageDigest('nl', SITE, LUNDI, CAMPAGNE)!;
    expect(nl.url.startsWith(`${SITE}/nl/enquete?`)).toBe(true);
    expect(nl.texte).toContain('tot 6 december');
    expect(nl.titre).toBe('Wat moet er veranderen aan de digest?');
    expect(nl.texte).toBe(
      'Tien vragen, anoniem, tot 6 december. Uw antwoorden bepalen het vervolg. Resultaten in de digest van 14 december.',
    );
  });

  it('aucun encart hors fr et nl, ni hors campagne', () => {
    expect(encartSondageDigest('en', SITE, LUNDI, CAMPAGNE)).toBeNull();
    expect(encartSondageDigest('de', SITE, LUNDI, CAMPAGNE)).toBeNull();
    expect(encartSondageDigest('fr', SITE, new Date('2026-12-07T08:00:00Z'), CAMPAGNE)).toBeNull();
    expect(encartSondageDigest('fr', SITE, new Date('2026-09-29T08:00:00Z'), CAMPAGNE)).toBeNull();
  });

  it('l’email place l’encart en tête, avant « En bref », en HTML comme en texte', async () => {
    const props: DigestEmailProps = {
      locale: 'fr',
      updates: [],
      weekOf: '28 septembre — 4 octobre 2026',
      unsubscribeUrl: `${SITE}/fr/subscribe/preferences?token=x`,
      summaryLine: 'RESUME_DE_LA_SEMAINE',
      weeklyNumber: { value: '1', label: 'l', source: 's' },
      closingNote: '',
      commitmentCount: 0,
      siteUrl: SITE,
      sondage: encartSondageDigest('fr', SITE, LUNDI, CAMPAGNE),
    };
    const html = await render(DigestEmail(props));
    const iSondage = html.indexOf('Que faut-il changer au digest');
    expect(iSondage).toBeGreaterThan(-1);
    expect(iSondage).toBeLessThan(html.indexOf('RESUME_DE_LA_SEMAINE'));
    expect(html).toContain('utm_campaign=sondage');

    const texte = generateDigestPlainText(props);
    expect(texte.indexOf('/fr/sondage?')).toBeGreaterThan(-1);
    expect(texte.indexOf('/fr/sondage?')).toBeLessThan(texte.indexOf('RESUME_DE_LA_SEMAINE'));

    const sans = await render(DigestEmail({ ...props, sondage: null }));
    expect(sans).not.toContain('Que faut-il changer au digest');
    expect(sans).not.toContain('utm_campaign=sondage');
  });
});
