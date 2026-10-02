// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import Link from 'next/link';
import type { LectureInstantane } from '@/lib/themes-muets';
import { Tile, TileStat, TileUnavailable } from './tile';

const TITRE = 'Thèmes en silence';

const jourEnClair = (iso: string) =>
  new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Brussels' }).format(
    new Date(iso),
  );
const abonnes = (n: number) => `${n} ${n === 1 ? 'abonné' : 'abonnés'}`;

/**
 * Affichage de la mesure des thèmes en silence. Présentationnel pur : la
 * lecture du fichier, les libellés et les liens arrivent en propriétés.
 * Uniquement des comptes, jamais une adresse.
 */
export function ThemesMuetsVue({
  lecture,
  libelles,
  liens,
}: {
  lecture: LectureInstantane;
  libelles: Record<string, string>;
  liens: Record<string, string>;
}) {
  if (lecture.etat === 'absent') {
    return (
      <Tile title={TITRE}>
        <TileUnavailable reason="Le relevé quotidien n'a pas encore été calculé, ou son fichier est illisible." />
      </Tile>
    );
  }

  const i = lecture.instantane;
  const calme = i.abonnesEnSilence === 0 && i.themesMuets.length === 0;

  return (
    <Tile title={TITRE}>
      {lecture.etat === 'perime' && (
        <p role="status" className="mb-2 text-sm font-medium text-status-delayed">
          Calcul du {jourEnClair(i.calculeLe)}, plus à jour : la tâche quotidienne ne tourne plus.
        </p>
      )}

      {calme ? (
        <p className="text-sm text-neutral-700">
          Aucun thème suivi n’est resté sans mise à jour depuis {i.fenetreJours} jours.
        </p>
      ) : (
        <>
          <TileStat
            value={i.abonnesEnSilence}
            label={`${i.abonnesEnSilence === 1 ? 'abonné' : 'abonnés'} sur ${i.abonnes} sans rien dans leurs thèmes depuis ${i.fenetreJours} jours`}
          />
          {i.themesMuets.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {i.themesMuets.map((t) => {
                const libelle = libelles[t.theme] ?? t.theme;
                const lien = liens[t.theme];
                return (
                  <li key={t.theme}>
                    {lien ? (
                      <Link href={lien} className="text-brand-700 underline-offset-4 hover:underline">
                        {libelle}
                      </Link>
                    ) : (
                      libelle
                    )}
                    {' : '}
                    {abonnes(t.abonnes)}
                    {t.derniereMaj
                      ? `, dernière mise à jour le ${jourEnClair(t.derniereMaj)}`
                      : ', aucune mise à jour connue'}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {i.sansEnvoiPossible.abonnesSeuls > 0 && (
        <p className="mt-3 text-sm text-neutral-600">
          {abonnes(i.sansEnvoiPossible.abonnesSeuls)}{' '}
          {i.sansEnvoiPossible.abonnesSeuls === 1 ? 'ne suit' : 'ne suivent'} que des thèmes sans envoi (
          {i.sansEnvoiPossible.themes.map((t) => libelles[t] ?? t).join(', ')}).
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        À vérifier, pas à remplir : un thème sans fait nouveau reste muet.
      </p>
      {lecture.etat === 'frais' && (
        <p className="mt-1 text-xs text-neutral-500">Calculé le {jourEnClair(i.calculeLe)}.</p>
      )}
    </Tile>
  );
}
