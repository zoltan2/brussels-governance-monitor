'use client';

// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { CheckState } from '@/lib/github-pr';

const POLL_MS = 20_000;
/**
 * Quinze minutes, puis on s'arrête. Le sondage était sans borne, et chaque
 * tick relance le rendu serveur COMPLET — vingt-quatre appels à l'API GitHub
 * par rendu, mesuré sur une PR réelle, sur le quota horaire partagé avec la
 * veille et les routes du digest. Un contrôle coincé le consommait jusqu'à ce
 * que quelqu'un ferme l'onglet.
 */
const POLL_MAX_MS = 15 * 60_000;
const POLL_MAX_TICKS = POLL_MAX_MS / POLL_MS;

export function ActionBar({
  number,
  sha,
  checks,
  truncated,
  fileRefusal,
  locale,
}: {
  number: number;
  sha: string;
  checks: CheckState;
  truncated: boolean;
  /** Message de la liste blanche, ou `null`. Vient de `fileSetRefusal`. */
  fileRefusal: string | null;
  locale: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- garde de montage, rendu unique volontaire (même motif qu'accessibility-toolbar.tsx:358)
  useEffect(() => { setMounted(true); }, []);

  const [ticks, setTicks] = useState(0);

  // `pending > 0` NE SUFFIT PAS. Le cas d'arrivée le plus fréquent est
  // l'inverse : on ouvre le lien avant que GitHub ait créé les contrôles,
  // donc `pending === 0` et `missing` non vide — et il n'y avait alors aucun
  // sondage, bouton gris, écran figé, rien n'invitant à recharger. C'est
  // exactement le défaut que cette conception existe pour corriger.
  const waiting = checks.pending > 0 || checks.missing.length > 0;
  const exhausted = ticks >= POLL_MAX_TICKS;

  useEffect(() => {
    if (!waiting || exhausted) return;
    const id = setInterval(() => {
      setTicks((t) => t + 1);
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(id);
    // `ticks` n'est volontairement PAS une dépendance : l'intervalle doit
    // battre régulièrement, et seul le passage du plafond (`exhausted`) le
    // fait tomber.
  }, [waiting, exhausted, router]);

  const blocked =
    checks.failed.length > 0 ||
    checks.pending > 0 ||
    checks.missing.length > 0 ||
    truncated ||
    fileRefusal !== null;

  const label = truncated
    ? 'Publication indisponible'
    : fileRefusal
    ? 'Fichiers hors périmètre'
    : checks.failed.length > 0
      ? 'Contrôles en échec'
      : checks.pending > 0
        ? `Contrôles en cours (${checks.passed}/${checks.total})`
        : checks.missing.length > 0
          ? 'Contrôles manquants'
          : busy
            ? 'Publication…'
            : 'Publier maintenant';

  async function publish() {
    setBusy(true);
    setError(null);
    // `fetch` lui-même rejette sur une coupure réseau — le mode d'usage cible
    // est le téléphone. Sans ce `catch`, `setBusy(false)` n'était jamais
    // atteint : le bouton restait « Publication… », désactivé, muet, jusqu'au
    // rechargement. Le `finally` est la seule façon de le garantir.
    try {
      const res = await fetch('/api/admin/content/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, sha }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'La publication a échoué.');
      }
    } catch {
      setError(
        'Réseau injoignable. La veille n\'a pas été publiée : vérifier la connexion, puis réessayer.',
      );
    } finally {
      setBusy(false);
    }
  }

  // Le <header> du site porte `backdrop-filter`, qui casse `position: fixed`
  // chez ses descendants. La barre doit donc être montée sur document.body.
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-neutral-50 p-4 shadow-lg">
      <div className="mx-auto max-w-3xl">
        {/* Le sondage s'arrête au plafond : sans ce message, l'écran redevient
            figé et silencieux, le défaut d'origine. */}
        {waiting && exhausted && (
          <p className="mb-3 rounded border border-amber-500 bg-amber-50/60 p-2 text-sm text-neutral-900">
            Rien n&apos;a bougé depuis quinze minutes, la mise à jour
            automatique s&apos;est arrêtée.{' '}
            <button
              type="button"
              onClick={() => {
                setTicks(0);
                router.refresh();
              }}
              className="underline"
            >
              Recharger
            </button>{' '}
            ou vérifier les contrôles sur GitHub.
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          {/* `/admin/content` redirige aussitôt sur cette page dans le cas
              nominal (une seule veille en attente) : le bouton ne ferait
              rien. `/admin` est la cible qui ramène réellement ailleurs. */}
          <a href={`/${locale}/admin`} className="text-sm underline">
            Retour
          </a>
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-neutral-900">{error}</span>}
            <button
              type="button"
              onClick={publish}
              disabled={blocked || busy}
              className="rounded bg-brand-800 px-5 py-3 text-base font-medium text-neutral-50 disabled:opacity-50"
            >
              {label}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
