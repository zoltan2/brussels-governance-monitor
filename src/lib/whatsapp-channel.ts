// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// L'invitation à suivre la chaîne WhatsApp est un réglage, comme le second bouton du
// haut de page (homepage-cta.ts) : adresse et textes vivent dans
// data/whatsapp-channel.json. Une langue sans textes n'affiche rien : la chaîne publie
// en français, néerlandais et anglais, l'allemand est donc volontairement absent.

import { z } from 'zod';
import rawData from '../../data/whatsapp-channel.json';

const textesSchema = z.object({
  accroche: z.string().min(1),
  bouton: z.string().min(1),
  piedDePage: z.string().min(1),
  nouvelOnglet: z.string().min(1),
});

const canalSchema = z.object({
  url: z.string().url().startsWith('https://whatsapp.com/channel/'),
  textes: z.record(z.string(), textesSchema),
});

// Validé au chargement du module : un réglage incomplet fait échouer le build,
// jamais la page en production.
const parsed = canalSchema.parse(rawData);

export interface WhatsappChannel {
  url: string;
  accroche: string;
  bouton: string;
  piedDePage: string;
  nouvelOnglet: string;
}

/** L'invitation dans la langue demandée, ou `null` si la chaîne n'est pas proposée dans cette langue. */
export function getWhatsappChannel(locale: string): WhatsappChannel | null {
  const textes = parsed.textes[locale];
  return textes ? { url: parsed.url, ...textes } : null;
}
