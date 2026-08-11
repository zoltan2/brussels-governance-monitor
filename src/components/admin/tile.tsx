// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Link from 'next/link';

/**
 * Coquille visuelle commune des tuiles du hub /admin.
 *
 * Présentationnel pur : chaque tuile reste responsable de sa propre source
 * de données et de la capture de ses propres erreurs.
 */
export function Tile({
  title,
  href,
  linkLabel,
  external,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
      <h2 className="text-sm font-semibold tracking-wide text-neutral-600 uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
      {href &&
        linkLabel &&
        (external ? (
          <a
            href={href}
            className="mt-4 inline-block text-sm text-brand-700 underline-offset-4 hover:underline"
          >
            {linkLabel}
          </a>
        ) : (
          <Link
            href={href}
            className="mt-4 inline-block text-sm text-brand-700 underline-offset-4 hover:underline"
          >
            {linkLabel}
          </Link>
        ))}
    </section>
  );
}

export function TileStat({
  value,
  label,
}: {
  value: string | number;
  label: string;
}) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-neutral-900">{value}</span>
      <span className="text-sm text-neutral-600">{label}</span>
    </p>
  );
}

export function TileUnavailable({ reason }: { reason: string }) {
  return <p className="text-sm text-neutral-500">Indisponible. {reason}</p>;
}

export function TileSkeleton({ title }: { title: string }) {
  return (
    <Tile title={title}>
      <p className="text-sm text-neutral-500" aria-live="polite">
        Chargement…
      </p>
    </Tile>
  );
}
