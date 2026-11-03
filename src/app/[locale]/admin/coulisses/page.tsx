// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Admin « Les coulisses de BGM » : bienvenue et édition du mois (fr, nl, en), simulation, essai vers
 * ADMIN_EMAIL, envoi réel. Les routes /api/admin/coulisses/* contrôlent
 * chacune la session ; le layout admin couvre la page.
 */
import type { Metadata } from 'next';
import { CoulissesAdmin } from '@/components/admin/coulisses-admin';
import { requireAdmin } from '@/lib/require-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin · Les coulisses de BGM',
  robots: { index: false, follow: false },
};

export default async function Page() {
  await requireAdmin();
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Les coulisses de BGM</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Un rendez-vous par mois, le premier jeudi. Deux contenus : la bienvenue (modèle versionné, reçu une seule fois
        par chaque abonné) et l&apos;édition du mois (pour ceux qui ont déjà reçu la bienvenue, facultative). Le gabarit
        ajoute la note aux abonnés en allemand, la ligne LinkedIn et WhatsApp, le P.-S. de refus sous la bienvenue et
        le pied de page. Simuler, faire un essai, puis envoyer : tout changement, et la clôture du sondage, périment
        l&apos;essai.
      </p>
      <CoulissesAdmin />
    </section>
  );
}
