// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Le second bouton du haut de page est un réglage, pas du code : libellé et URL vivent
// dans data/homepage-cta.json, comme radar.json ou commitments.json. Éditer le fichier
// suffit, le déploiement suivant reprend la valeur, et git garde la trace du changement.

import { z } from 'zod';
import rawData from '../../data/homepage-cta.json';

const ctaSchema = z.object({
  href: z.string().min(1),
  label: z.object({
    fr: z.string().min(1),
    nl: z.string().min(1),
    en: z.string().min(1),
    de: z.string().min(1),
  }),
});

// Validé au chargement du module : un réglage incomplet fait échouer le build,
// jamais la page en production.
const parsed = ctaSchema.parse(rawData);

export interface HomepageCta {
  href: string;
  label: string;
}

export function getHomepageCta(locale: string): HomepageCta {
  const label = parsed.label[locale as keyof typeof parsed.label] ?? parsed.label.fr;
  return { href: parsed.href, label };
}
