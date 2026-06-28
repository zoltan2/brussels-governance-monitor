// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.
//
// Local preview of the REDESIGN digest email (sub-chantier #2) with w26 data.
// No Resend, no network. Writes .preview/digest-redesign.html.
//   npx tsx scripts/preview-digest-redesign.ts

import { render } from '@react-email/render';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createElement } from 'react';
import DigestRedesign, { type DigestRedesignProps } from '../src/emails/digest-redesign';

const props: DigestRedesignProps = {
  locale: 'fr',
  weekOf: 'Semaine 26 · 22-28 juin 2026',
  hero: {
    variant: 'number',
    value: '400+',
    valueLabel: "interventions médicales du SIAMU pendant la première vague de chaleur de l'été",
    eyebrow: 'Cette semaine · Climat',
    lead: "Une ville à 38 °C pendant que ses moyens fondent. La canicule a saturé les services d'urgence, fermé les parcs régionaux et la forêt de Soignes, fait grimper la consommation électrique de 11 % — et rappelé que la Région n'a toujours pas de plan social climat un an après l'échéance européenne.",
  },
  items: [
    { category: 'Propreté · Ville de Bruxelles', headline: 'La Ville double ses taxes incivilités (1000 €/m³, vote le 29 juin, effet 1er août).', url: 'https://governance.brussels/fr/domaines/cleanliness' },
    { category: 'Économie · Région', headline: 'Visit.brussels : 37 départs validés (¼ de l’effectif), budget ramené à 12,5 M€.', url: 'https://governance.brussels/fr/domaines/economy' },
    { category: 'Institutionnel · Communes', headline: '16 communes sur 19 votent contre les visites domiciliaires fédérales.', url: 'https://governance.brussels/fr/domaines/institutional' },
    { category: 'Mobilité · LEZ', headline: 'Faille des oldtimers : 13 799 véhicules exemptés sans contrôle d’usage.', url: 'https://governance.brussels/fr/dossiers/lez' },
    { category: 'Emploi · Région', headline: '28,1 % des exclus du chômage se sont tournés vers un CPAS.', url: 'https://governance.brussels/fr/domaines/employment' },
    { category: 'Économie · Région', headline: 'Signal positif : solde d’entreprises +4 en 2024, une première depuis 2008.', url: 'https://governance.brussels/fr/domaines/economy' },
  ],
  closingNote: 'Vous recevez les sujets que vous avez choisis, tous au même niveau. Le récit de la semaine est dans le hero ; le reste, ce sont des faits à suivre. Retour lundi prochain.',
  magazineUrl: 'https://magazine.governance.brussels/latest/',
  siteUrl: 'https://governance.brussels',
  unsubscribeUrl: 'https://governance.brussels/unsubscribe?token=PREVIEW',
};

async function main() {
  const html = await render(createElement(DigestRedesign, props));
  mkdirSync('.preview', { recursive: true });
  writeFileSync('.preview/digest-redesign.html', html);
  console.log('[digest-redesign] Preview → .preview/digest-redesign.html');
}

main();
