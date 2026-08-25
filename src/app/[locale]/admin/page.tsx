// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { TileSkeleton } from '@/components/admin/tile';
import { TrafficTile } from '@/components/admin/traffic-tile';
import { InfraTile } from '@/components/admin/infra-tile';
import { SubscribersTile } from '@/components/admin/subscribers-tile';
import { DigestTile } from '@/components/admin/digest-tile';
import { DraftsTile } from '@/components/admin/drafts-tile';
import { ContentTile } from '@/components/admin/content-tile';
import { ChatTile } from '@/components/admin/chat-tile';
import { RefonteTile } from '@/components/admin/refonte-tile';
import { GamesTile } from '@/components/admin/games-tile';
import { QuizTile } from '@/components/admin/quiz-tile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Admin — Vue d'ensemble",
    robots: { index: false, follow: false },
  };
}

/**
 * Un <Suspense> par tuile, et non un seul autour de la grille : c'est ce
 * qui garantit qu'une source lente (Umami, Resend) ne retarde pas
 * l'affichage des autres.
 */
export default async function AdminHubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-6xl px-4">
      <h1 className="mb-8 text-3xl font-bold text-neutral-900">
        Vue d&apos;ensemble
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<TileSkeleton title="Trafic" />}>
          <TrafficTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Santé infra" />}>
          <InfraTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Abonnés" />}>
          <SubscribersTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Digest en cours" />}>
          <DigestTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Brouillons" />}>
          <DraftsTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Veilles à publier" />}>
          <ContentTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Chat" />}>
          <ChatTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Refonte" />}>
          <RefonteTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Quiz" />}>
          <QuizTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton title="Jeux" />}>
          <GamesTile />
        </Suspense>
      </div>
    </div>
  );
}
