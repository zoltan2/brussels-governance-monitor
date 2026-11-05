// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Historique des envois des coulisses (5 novembre 2026), sous le rapport du
 * mois dans /fr/admin/coulisses. Deux vues : par rendez-vous, par version de
 * la bienvenue. Des nombres, jamais de pourcentages (une centaine
 * d'abonnés) ; l'écart au rendez-vous précédent entre parenthèses. Données :
 * src/lib/coulisses/historique.ts.
 */
import type { Historique, LigneRendezVous } from '@/lib/coulisses/historique';

const nombre = (n: number) => new Intl.NumberFormat('fr-BE').format(n);

export function moisCourt(mois: string | null): string {
  if (!mois || !/^\d{4}-\d{2}$/.test(mois)) return mois ?? '?';
  const d = new Date(`${mois}-15T12:00:00Z`);
  return new Intl.DateTimeFormat('fr-BE', { month: 'short', year: 'numeric', timeZone: 'Europe/Brussels' }).format(d);
}

/** « 140 (+9) » ; sans écart pour la première ligne ou une valeur absente. */
export function avecEcart(n: number | null, precedent: number | null | undefined): string {
  if (n === null) return '–';
  if (precedent === null || precedent === undefined) return nombre(n);
  const e = n - precedent;
  return `${nombre(n)} (${e > 0 ? '+' : e < 0 ? '−' : '±'}${nombre(Math.abs(e))})`;
}

function Cellule({ children, alerte = false }: { children: React.ReactNode; alerte?: boolean }) {
  return (
    <td className={`py-1 pr-4 text-right tabular-nums ${alerte ? 'font-semibold text-status-delayed' : ''}`}>{children}</td>
  );
}

const COLONNES = ['Abonnés', 'Bienvenues', 'Édition', 'Trop récents', 'Refus*', 'Rebonds', 'Plaintes', 'Incidents'];

export function CoulissesHistorique({ historique }: { historique: Historique }) {
  const { rendezVous, versions, refusNonRattaches, reactivations, envoisSansEmpreinte } = historique;
  const prec = (i: number): LigneRendezVous | undefined => (i > 0 ? rendezVous[i - 1] : undefined);

  return (
    <section aria-labelledby="coulisses-historique-titre" className="space-y-5 rounded border border-neutral-200 p-4 text-sm text-neutral-800">
      <h2 id="coulisses-historique-titre" className="text-base font-semibold text-neutral-900">Historique des envois</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left">
          <caption className="mb-1 text-left text-xs font-semibold text-neutral-900">Par rendez-vous</caption>
          <thead>
            <tr className="border-b border-neutral-200 text-xs text-neutral-700">
              <th scope="col" className="py-1 pr-4 font-medium">Rendez-vous</th>
              {COLONNES.map((c) => (
                <th key={c} scope="col" className="py-1 pr-4 text-right font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rendezVous.map((l, i) => {
              const p = prec(i);
              return (
                <tr key={l.numero} className="border-b border-neutral-100">
                  <th scope="row" className="py-1 pr-4 font-normal">{moisCourt(l.mois)}</th>
                  <Cellule>{avecEcart(l.abonnes, p?.abonnes)}</Cellule>
                  <Cellule>
                    {/* Sans écart : le n° 1 accueillait tout le monde, les suivants seulement les nouveaux. */}
                    {nombre(l.bienvenues)}
                    {l.versionBienvenue !== null && l.bienvenues > 0 ? ` (v${l.versionBienvenue})` : ''}
                  </Cellule>
                  <Cellule>{avecEcart(l.edition, p?.edition)}</Cellule>
                  <Cellule>{avecEcart(l.tropRecents, p?.tropRecents)}</Cellule>
                  <Cellule>{nombre(l.refus)}</Cellule>
                  <Cellule>{nombre(l.rebonds)}</Cellule>
                  <Cellule alerte={l.plaintes > 0}>{nombre(l.plaintes)}</Cellule>
                  <Cellule alerte={l.incidents > 0}>{nombre(l.incidents)}</Cellule>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-neutral-700">* refus faits dans les 30 jours après ce rendez-vous, par une personne qui l’avait reçu.</p>
      </div>

      {versions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full max-w-xl text-left">
            <caption className="mb-1 text-left text-xs font-semibold text-neutral-900">Par version de la bienvenue</caption>
            <thead>
              <tr className="border-b border-neutral-200 text-xs text-neutral-700">
                <th scope="col" className="py-1 pr-4 font-medium">Version</th>
                <th scope="col" className="py-1 pr-4 font-medium">Active depuis</th>
                <th scope="col" className="py-1 pr-4 text-right font-medium">Reçue par</th>
                <th scope="col" className="py-1 pr-4 text-right font-medium">Refus dans les 30 j</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.version} className="border-b border-neutral-100 align-top">
                  <th scope="row" className="py-1 pr-4 font-normal">v{v.version}</th>
                  <td className="py-1 pr-4">
                    {moisCourt(v.depuis)}
                    {v.parMois.length > 1 && (
                      <details className="text-xs text-neutral-700">
                        <summary className="cursor-pointer">par mois d’arrivée</summary>
                        {v.parMois.map((m) => `${moisCourt(m.mois)} ${nombre(m.n)}`).join(' · ')}
                      </details>
                    )}
                  </td>
                  <Cellule>{nombre(v.recuePar)}</Cellule>
                  <Cellule>{nombre(v.refus)}</Cellule>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="space-y-1 text-xs text-neutral-700">
        <li>Refus non rattachés (plus de 30 jours après le dernier mail reçu, ou sans envoi connu) : {nombre(refusNonRattaches)}.</li>
        <li>Réactivations (refus puis retour) : {nombre(reactivations)}.</li>
        {envoisSansEmpreinte > 0 && (
          <li>
            {nombre(envoisSansEmpreinte)} {envoisSansEmpreinte > 1 ? 'envois' : 'envoi'} encore sans empreinte : les refus qui
            les suivent seront rattachés après le prochain rendez-vous, qui complète les empreintes.
          </li>
        )}
        <li>Refus datés depuis le 5 novembre 2026 seulement ; les chiffres d’envoi viennent des rapports figés à chaque rendez-vous.</li>
      </ul>
    </section>
  );
}
