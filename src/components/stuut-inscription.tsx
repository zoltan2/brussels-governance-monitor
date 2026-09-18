// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

// Composant client par héritage : il n'est importé que par stuut-game.tsx, qui
// porte la directive 'use client'. L'y ajouter ici en ferait un point d'entrée
// client, dont les props devraient être sérialisables (onInscrit ne l'est pas).
//
// Inscription au Stuut par e-mail, depuis le Stuut natif du panneau de jeux.
//
// Retirée au passage en natif (#499) faute de CORS sur stuut-api, rétablie le
// 18/09/2026 : la route /api/subscribe accepte governance.brussels, et lui seul.
// Le service reste celui du jeu autonome, avec sa double confirmation.
//
// Deux règles de confidentialité, non négociables :
//   - l'adresse ne part QUE vers stuut-api, jamais vers la mesure d'audience :
//     les événements Umami ne portent que l'emplacement du formulaire et, en cas
//     d'échec, le code de statut ;
//   - rien n'est retenu de l'adresse sur l'appareil, seulement le fait d'être
//     inscrit (pour ne plus réinviter), comme le jeu autonome.
//
// Revu par l'équipe rouge le 19/09/2026 : focus dans le champ à l'ouverture depuis
// l'en-tête (sinon la frappe partait sur le plateau), région live permanente et
// focus sur la confirmation, aria-invalid réservé au format, délai maximal de
// 15 s, échecs mesurés, lien de repli, textes exacts (voir plus bas).

import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { track } from '@/lib/analytics';
import { STUUT_API_INSCRIPTION, STUUT_SITE, emailValide } from '@/lib/stuut';
import s from './stuut-game.module.css';

type Etat =
  | { etape: 'saisie' | 'envoi' }
  | { etape: 'erreur'; message: string; formatInvalide: boolean; essai: number };

const MSG_INVALIDE = 'Adresse e-mail invalide.';
const MSG_ECHEC = "L'inscription n'a pas abouti.";
const MSG_TROP = 'Trop de tentatives depuis cette connexion. Attendez une minute, puis réessayez.';
const DELAI_MAX_MS = 15_000;

export type SourceInscription = 'fin-partie' | 'entete';

export function StuutInscription({
  source,
  dejaInscrit,
  reussie,
  focusALOuverture = false,
  onInscrit,
}: {
  source: SourceInscription;
  /** L'appareil est déjà inscrit (par ce formulaire, l'autre, ou le jeu autonome). */
  dejaInscrit: boolean;
  /** C'est CE formulaire qui vient d'aboutir : il affiche la confirmation. */
  reussie: boolean;
  /** À l'ouverture depuis l'en-tête : la frappe doit aller dans le champ, pas sur le plateau. */
  focusALOuverture?: boolean;
  onInscrit: (source: SourceInscription) => void;
}) {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<Etat>({ etape: 'saisie' });
  const champRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const idChamp = `${id}-email`;
  const idErreur = `${id}-erreur`;

  useEffect(() => {
    if (focusALOuverture) champRef.current?.focus();
  }, [focusALOuverture]);

  // Après succès, le focus va sur la confirmation : sinon il tombait sur <body>,
  // hors de la modale, et un lecteur d'écran n'entendait rien.
  useEffect(() => {
    if (reussie) confirmationRef.current?.focus();
  }, [reussie]);

  function echouer(message: string, formatInvalide: boolean) {
    setEtat((prec) => ({
      etape: 'erreur',
      message,
      formatInvalide,
      // Change à chaque tentative : la même erreur répétée est ré-annoncée.
      essai: prec.etape === 'erreur' ? prec.essai + 1 : 1,
    }));
  }

  async function envoyer(e: { preventDefault(): void }) {
    e.preventDefault();
    if (etat.etape === 'envoi') return;
    const adresse = email.trim();
    if (!emailValide(adresse)) {
      echouer(MSG_INVALIDE, true);
      return;
    }
    setEtat({ etape: 'envoi' });
    let statut = 0;
    try {
      const r = await fetch(STUUT_API_INSCRIPTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adresse }),
        // Aucun cookie à transporter : stuut-api n'en a pas besoin.
        credentials: 'omit',
        // Un serveur muet ne doit pas laisser le bouton bloqué sur « Envoi… ».
        signal: AbortSignal.timeout(DELAI_MAX_MS),
      });
      statut = r.status;
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      // Mesuré : sans cet événement, une panne (CORS absent, API tombée) ne se
      // verrait nulle part. Le statut seul, jamais l'adresse. 0 = réseau ou CORS.
      track('jeux-stuut-inscription-echec', { source, statut });
      echouer(statut === 429 ? MSG_TROP : MSG_ECHEC, false);
      return;
    }
    setEmail('');
    setEtat({ etape: 'saisie' });
    track('jeux-stuut-inscription', { source });
    onInscrit(source);
  }

  if (reussie) {
    return (
      <p
        ref={confirmationRef}
        tabIndex={-1}
        className={`${s.inscription} ${s.inscriptionOk}`}
        role="status"
      >
        C&apos;est noté. Si cette adresse n&apos;était pas encore inscrite, un e-mail de confirmation
        arrive dans quelques minutes : l&apos;inscription ne sera active qu&apos;après votre clic.
      </p>
    );
  }

  const erreur = etat.etape === 'erreur' ? etat : null;
  return (
    <form className={s.inscription} onSubmit={envoyer} noValidate>
      <p className={s.inscriptionTitre}>Le Stuut chaque matin par e-mail</p>
      <p className={s.inscriptionTexte}>
        Un e-mail par jour : le lien vers le Stuut du jour, et le mot de la veille avec sa définition.
      </p>
      {dejaInscrit && (
        <p className={s.inscriptionTexte}>
          Cet appareil est déjà inscrit. Vous pouvez quand même inscrire une autre adresse.
        </p>
      )}
      <div className={s.defi}>
        <label htmlFor={idChamp}>
          Votre adresse e-mail
          <input
            ref={champRef}
            id={idChamp}
            className={s.champ}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            // Réservé à un FORMAT invalide : une panne réseau ou un 429 ne rendent
            // pas l'adresse fausse.
            aria-invalid={erreur?.formatInvalide ? true : undefined}
            aria-describedby={erreur?.formatInvalide ? idErreur : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              if (erreur?.formatInvalide) setEtat({ etape: 'saisie' });
            }}
          />
        </label>
        <button type="submit" className={`${s.bouton} ${s.primaire}`} disabled={etat.etape === 'envoi'}>
          {etat.etape === 'envoi' ? 'Envoi…' : "S'inscrire"}
        </button>
      </div>
      {/* Région live toujours présente : un message inséré d'un coup, avec son
          conteneur, n'est pas annoncé de façon fiable. */}
      <div aria-live="assertive" className={s.inscriptionErreur}>
        {erreur && (
          <p id={idErreur} key={erreur.essai}>
            {erreur.message}
            {!erreur.formatInvalide && (
              <>
                {' '}
                <a className={s.lien} href={`${STUUT_SITE}/inscription/`} target="_blank" rel="noopener noreferrer">
                  S&apos;inscrire sur stuut.governance.brussels
                  <ExternalLink size={12} aria-hidden={true} className="ml-1 inline" />
                </a>
              </>
            )}
          </p>
        )}
      </div>
      <p className={s.inscriptionLegal}>
        Si cette adresse n&apos;est pas encore inscrite, vous recevez d&apos;abord un e-mail de
        confirmation. Chaque e-mail quotidien contient ensuite un lien de désinscription, valable à tout
        moment. Votre adresse ne sert qu&apos;à ces envois :{' '}
        {/* Nouvel onglet : le lecteur garde son formulaire et sa partie en cours. Le Stuut
            n'existe qu'en français, d'où la locale fixée. */}
        <Link className={s.lien} href="/privacy" locale="fr" target="_blank" rel="noopener">
          page vie privée
        </Link>
        .
      </p>
    </form>
  );
}
