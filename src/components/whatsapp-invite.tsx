// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { MessageCircle } from 'lucide-react';
import { TrackedAnchor } from '@/components/tracked-link';
import { getWhatsappChannel } from '@/lib/whatsapp-channel';

/**
 * Invitation à suivre la chaîne WhatsApp, sous le formulaire d'abonnement de l'accueil.
 * Ne rend rien dans une langue où la chaîne n'est pas proposée (data/whatsapp-channel.json).
 * Icône neutre et couleurs de la palette : pas de vert de marque.
 */
export function WhatsappInvite({ locale }: { locale: string }) {
  const canal = getWhatsappChannel(locale);
  if (!canal) return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-5 py-4 text-center sm:flex-row sm:text-left">
      <p className="flex-1 text-sm text-neutral-600">{canal.accroche}</p>
      <TrackedAnchor
        href={canal.url}
        event="accueil-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-700 px-5 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-700 hover:text-neutral-50"
      >
        <MessageCircle size={16} aria-hidden={true} />
        {canal.bouton}
        <span className="sr-only"> ({canal.nouvelOnglet})</span>
      </TrackedAnchor>
    </div>
  );
}
