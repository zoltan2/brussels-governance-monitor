// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// Bulle du chat et panneau de jeux, montés sur toutes les pages SAUF celles de
// src/lib/pages-sans-widgets.ts (le sondage lecteurs). Non montés plutôt que
// masqués : ni bouton dans l'ordre de tabulation, ni code des jeux chargé.

import { usePathname } from 'next/navigation';
import { ChatWidget } from '@/components/chat-widget';
import { GamesPanel } from '@/components/games-panel';
import { estPageSansWidgets } from '@/lib/pages-sans-widgets';

export function WidgetsFlottants({ locale }: { locale: string }) {
  const chemin = usePathname();
  if (estPageSansWidgets(chemin)) return null;
  return (
    <>
      <ChatWidget />
      <GamesPanel locale={locale} />
    </>
  );
}
