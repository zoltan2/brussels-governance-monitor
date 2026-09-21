// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// LE NOMBRE EST RENDU PAR LE SERVEUR, puis corrige par le navigateur.
//
// Version precedente : le serveur rendait « … » et le navigateur remplissait le
// compteur apres hydratation. Le raisonnement etait juste — la page d'accueil est
// prerendue une fois par deploiement, donc un nombre fige au build derive — mais
// le remede coutait plus cher que le mal :
//   - les captures d'ecran et les apercus sociaux montraient « … » ;
//   - un moteur ou un outil qui n'execute pas le JavaScript ne voyait aucun chiffre ;
//   - sur connexion lente, la premiere impression etait un compteur vide.
//
// Le compromis se resout en faisant les deux. Le serveur calcule le nombre au
// moment du rendu : il est donc present des le premier octet, juste pour tout le
// monde, y compris sans JavaScript. Le navigateur recalcule APRES le montage et
// corrige si la journee a change depuis la generation de la page.
//
// Pourquoi `useEffect` et non le rendu : corriger pendant le rendu produirait une
// divergence d'hydratation (le serveur a ecrit 219, le client veut ecrire 220).
// En corrigeant apres le montage, React hydrate d'abord le HTML du serveur, puis
// met a jour — aucun avertissement, aucun scintillement visible.
//
// La derive residuelle est bornee par la revalidation de la page d'accueil
// (`revalidate` dans src/app/[locale]/page.tsx) et, de toute facon, corrigee des
// que le JavaScript s'execute.

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

const DAY_MS = 86_400_000;

/** Le compteur ne depend d'aucune source externe : rien a souscrire. */
const subscribe = () => () => {};

function daysSince(isoDate: string, now: Date): number {
  const start = Date.parse(`${isoDate}T00:00:00Z`);
  // Tout en UTC, des deux côtés. La version précédente prenait le quantième LOCAL
  // (getFullYear/getMonth/getDate) et le comparait à un minuit UTC : entre minuit et
  // 2 h en heure belge, la date locale a déjà changé mais pas la date UTC, et le
  // compteur avançait d'un jour trop tôt. Attrapé par le test de ce composant.
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - start) / DAY_MS));
}

export function GovernmentDayCounter({
  oathDate,
  oathLabel,
}: {
  /** ISO date of the swearing-in (data/government.json → oathDate). */
  oathDate: string;
  /** Human-readable date, formatted server-side. */
  oathLabel: string;
}) {
  const t = useTranslations('home');
  // Valeur initiale calculee AUSSI BIEN au rendu serveur qu'au premier rendu
  // client : c'est elle qui part dans le HTML.
  // La primitive reste `useSyncExternalStore` : c'est elle qui sait rendre une
  // valeur cote serveur PUIS la resynchroniser cote client sans divergence
  // d'hydratation. Ce qui change, c'est l'instantané serveur : il rendait `null`
  // (d'ou le « … »), il rend maintenant le vrai nombre.
  //
  // Les deux instantanés calculent la meme chose. Ils ne different que si la
  // journée a change entre la generation de la page et sa consultation : React
  // rend alors le nombre du serveur, hydrate, puis corrige. Une valeur numerique
  // se compare par valeur, donc aucun rendu superflu quand elle est identique.
  const days = useSyncExternalStore(
    subscribe,
    () => daysSince(oathDate, new Date()),
    () => daysSince(oathDate, new Date()),
  );

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
        {t('protoCounterTitle')}
      </p>
      {/* `min-h` conserve : il reserve la hauteur et evite tout decalage de mise
          en page si le nombre change de largeur apres correction. */}
      <p className="mt-1 min-h-[2.5rem] text-4xl font-extrabold tabular-nums">{days}</p>
      <p className="mt-1 text-sm text-white/85">{t('protoCounterSince', { date: oathLabel })}</p>
    </div>
  );
}
