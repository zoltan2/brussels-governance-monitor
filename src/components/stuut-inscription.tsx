// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// Inscription au Stuut par e-mail, depuis le Stuut natif du panneau de jeux.
//
// Retirée au passage en natif (#499) faute de CORS sur stuut-api, rétablie le
// 18/09/2026 : la route /api/subscribe accepte désormais governance.brussels, et
// lui seul. Le service reste celui du jeu autonome, avec sa double confirmation.
//
// Deux règles de confidentialité, non négociables :
//   - l'adresse ne part QUE vers stuut-api, jamais vers la mesure d'audience :
//     l'événement Umami ne porte que l'emplacement du formulaire ;
//   - rien n'est retenu de l'adresse sur l'appareil, seulement le fait d'être
//     inscrit (pour ne plus réinviter), comme le jeu autonome.

import { useId, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { track } from '@/lib/analytics';
import { CLE_INSCRIT, STUUT_API_INSCRIPTION, emailValide } from '@/lib/stuut';
import s from './stuut-game.module.css';

type Etat = { etape: 'saisie' | 'envoi' } | { etape: 'erreur'; message: string } | { etape: 'ok' };

const MSG_INVALIDE = 'Adresse e-mail invalide.';
const MSG_ECHEC = "Ça n'a pas marché. Réessayez dans un instant.";
const MSG_TROP = 'Trop de tentatives depuis cette connexion. Attendez une minute, puis réessayez.';

export type SourceInscription = 'fin-partie' | 'entete';

export function StuutInscription({ source, dejaInscrit }: { source: SourceInscription; dejaInscrit: boolean }) {
  const [email, setEmail] = useState('');
  const [etat, setEtat] = useState<Etat>({ etape: 'saisie' });
  const id = useId();
  const idChamp = `${id}-email`;
  const idErreur = `${id}-erreur`;

  async function envoyer(e: { preventDefault(): void }) {
    e.preventDefault();
    const adresse = email.trim();
    if (!emailValide(adresse)) {
      setEtat({ etape: 'erreur', message: MSG_INVALIDE });
      return;
    }
    setEtat({ etape: 'envoi' });
    let statut = 0;
    try {
      const r = await fetch(STUUT_API_INSCRIPTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adresse }),
        // Aucun cookie à envoyer : stuut-api n'en a pas besoin, et un formulaire
        // tiers n'a pas à transporter l'identité du lecteur.
        credentials: 'omit',
      });
      statut = r.status;
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      setEtat({ etape: 'erreur', message: statut === 429 ? MSG_TROP : MSG_ECHEC });
      return;
    }
    // L'inscription est acquise : ni le stockage ni la mesure ne peuvent la reprendre.
    try {
      localStorage.setItem(CLE_INSCRIT, '1');
    } catch {
      // navigation privée : on réinvitera, ce n'est pas grave
    }
    setEmail('');
    setEtat({ etape: 'ok' });
    track('jeux-stuut-inscription', { source });
  }

  if (etat.etape === 'ok') {
    return (
      <p className={`${s.inscription} ${s.inscriptionOk}`} role="status">
        C&apos;est noté ! Vérifiez votre boîte mail pour confirmer l&apos;inscription.
      </p>
    );
  }

  const erreur = etat.etape === 'erreur' ? etat.message : null;
  return (
    <form className={s.inscription} onSubmit={envoyer} noValidate>
      <p className={s.inscriptionTitre}>Le Stuut chaque matin par e-mail</p>
      <p className={s.inscriptionTexte}>
        Un e-mail par jour : le lien vers le Stuut du jour, et le mot de la veille avec sa définition. Rien
        d&apos;autre.
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
            id={idChamp}
            className={s.champ}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            aria-invalid={erreur ? true : undefined}
            aria-describedby={erreur ? idErreur : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" className={`${s.bouton} ${s.primaire}`} disabled={etat.etape === 'envoi'}>
          {etat.etape === 'envoi' ? 'Envoi…' : "S'inscrire"}
        </button>
      </div>
      {erreur && (
        <p id={idErreur} className={s.inscriptionErreur} role="alert">
          {erreur}
        </p>
      )}
      <p className={s.inscriptionLegal}>
        Vous recevez d&apos;abord un e-mail de confirmation. Chaque e-mail contient ensuite un lien de
        désinscription, valable à tout moment. Votre adresse ne sert qu&apos;à cela :{' '}
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
