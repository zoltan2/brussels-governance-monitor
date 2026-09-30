// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// Sondage lecteurs du digest (spec bgm-ops 2026-09-25-sondage-lecteurs-design.md, § 13).
//
// Un écran par question, un POST par écran (/api/sondage). Accessibilité (EAA),
// sur le modèle de src/components/stuut-inscription.tsx :
//   - à chaque changement d'écran, le focus va sur le titre (h1, tabIndex=-1) :
//     sinon il resterait sur un bouton disparu et un lecteur d'écran n'entendrait
//     rien ;
//   - contrôles natifs seulement (radio, fieldset/legend, textarea, input) ;
//   - une zone `role="status"` montée dès l'affichage : un message inséré d'un
//     coup avec son conteneur n'est pas annoncé de façon fiable ;
//   - chaque erreur est liée à son champ (aria-describedby) ;
//   - l'état choisi se voit autrement que par la couleur (pastille native,
//     texte en gras, bordure épaisse).
// Palette : tokens du site (neutral, brand, warning), jamais de classe `dark:`.
//
// Mesure d'audience : trois événements SANS contenu de réponse. Seul l'identifiant
// de l'étape part, jamais une valeur choisie ni un texte saisi.

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { track } from '@/lib/analytics';
import { emailValide } from '@/lib/stuut';
import type { EtatInitial } from '@/lib/sondage/page-etat';
import {
  ETAPES_AVEC_AUTRE,
  AUTRE_MAX,
  OPTIONS,
  Q5_ETATS,
  Q5_NOMS,
  Q8_MAX,
  OBLIGATOIRES,
  etapePrecedente,
  parcours,
  type Etape,
  type EtapeChoix,
  type LangueSondage,
  type Reponses,
  type ReponseChoix,
} from '@/lib/sondage/questionnaire';
import { DUREE_ANNONCEE_MINUTES, TEXTES } from '@/lib/sondage/textes';

type Ecran = 'accueil' | Etape | 'fin' | 'deja' | 'clos' | 'pas_encore' | 'indisponible';
type Erreur = { message: string; champ: 'choix' | 'email' | 'global'; essai: number };

const DELAI_MAX_MS = 15_000;

function ecranInitial(i: EtatInitial): Ecran {
  switch (i.mode) {
    case 'reprise':
      return i.etape;
    case 'termine':
      return 'deja';
    default:
      return i.mode;
  }
}

/** Le corps envoyé pour une étape, à partir du brouillon local. Q9 : l'adresse ne voyage qu'avec « oui ». */
function corpsEtape(etape: Etape, r: Reponses, email: string): Record<string, unknown> {
  switch (etape) {
    case 'q5':
      return { etape, reponse: { lignes: r.q5?.lignes ?? {} } };
    case 'q8': {
      const texte = r.q8?.texte ?? '';
      return { etape, reponse: { texte, citation: texte.trim() ? (r.q8?.citation ?? 'non') : 'non' } };
    }
    case 'q9': {
      const valeur = r.q9?.valeur ?? null;
      return { etape, reponse: valeur === 'oui' ? { valeur, email: email.trim() } : { valeur } };
    }
    default: {
      const rep = r[etape] as ReponseChoix | undefined;
      const valeur = rep?.valeur ?? null;
      const avecAutre = (ETAPES_AVEC_AUTRE as readonly string[]).includes(etape);
      if (avecAutre && valeur === 'autre' && rep?.autre) return { etape, reponse: { valeur, autre: rep.autre } };
      return { etape, reponse: { valeur } };
    }
  }
}

const CARTE =
  'flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-neutral-400 bg-neutral-50 px-3 py-2.5 text-neutral-900 has-[:checked]:border-2 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:checked]:font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-700';
const RADIO = 'mt-0.5 h-5 w-5 shrink-0 accent-brand-700';
const CHAMP =
  'mt-1 block w-full rounded-md border border-neutral-500 bg-neutral-50 px-3 py-2 text-base text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';
const BOUTON_PRIMAIRE =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-brand-900 px-5 py-2 text-base font-semibold text-neutral-50 hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-60';
const BOUTON_SECONDAIRE =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-neutral-500 px-5 py-2 text-base text-neutral-800 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700';

export function Sondage({
  langue,
  initial,
  pilote,
  lienNotice,
}: {
  langue: LangueSondage;
  initial: EtatInitial;
  pilote: boolean;
  /** Chemin localisé de la section « Sondage lecteurs » de /privacy. */
  lienNotice: string;
}) {
  const t = TEXTES[langue];
  const [ecran, setEcran] = useState<Ecran>(() => ecranInitial(initial));
  const [reponses, setReponses] = useState<Reponses>(() => (initial.mode === 'reprise' ? initial.reponses : {}));
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<Erreur | null>(null);
  const [annonce, setAnnonce] = useState('');
  const titreRef = useRef<HTMLHeadingElement>(null);
  const piegeRef = useRef<HTMLInputElement>(null);
  const premierRendu = useRef(true);
  const id = useId();
  const idErreur = `${id}-erreur`;

  // Focus sur le titre à chaque changement d'écran, pas au chargement de la page
  // (le lecteur arrive alors normalement, par le lien d'évitement ou le haut).
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    titreRef.current?.focus();
  }, [ecran]);

  function echouer(message: string, champ: Erreur['champ']) {
    setErreur((prec) => ({ message, champ, essai: (prec?.essai ?? 0) + 1 }));
  }

  function changerEcran(e: Ecran) {
    setErreur(null);
    setAnnonce('');
    setEcran(e);
  }

  function modifier<E extends keyof Reponses>(etape: E, valeur: Reponses[E]) {
    setReponses((r) => ({ ...r, [etape]: valeur }));
    if (erreur?.champ === 'choix') setErreur(null);
  }

  async function poster(corps: Record<string, unknown>): Promise<{ status: number; json: Record<string, unknown> }> {
    const r = await fetch('/api/sondage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...corps, site: piegeRef.current?.value ?? '' }),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    });
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: r.status, json };
  }

  function traiterRefus(status: number, json: Record<string, unknown>) {
    const code = json.erreur;
    if (status === 410) return changerEcran(code === 'sondage_pas_ouvert' ? 'pas_encore' : 'clos');
    if (code === 'deja_termine') return changerEcran('deja');
    if (code === 'session_absente') {
      setReponses({});
      changerEcran('accueil');
      setAnnonce(t.erreurSession);
      return;
    }
    if (code === 'incomplet' && typeof json.etape === 'string') {
      changerEcran(json.etape as Etape);
      echouer(t.erreurObligatoire, 'choix');
      return;
    }
    if (code === 'email_vide') return echouer(t.erreurEmailVide, 'email');
    if (code === 'email_invalide') return echouer(t.erreurEmailInvalide, 'email');
    if (status === 429) return echouer(t.erreurTropDeRequetes, 'global');
    if (status === 503) return echouer(t.indisponible, 'global');
    echouer(t.erreurEnregistrement, 'global');
  }

  async function commencer() {
    if (envoi) return;
    setEnvoi(true);
    try {
      const { status, json } = await poster({ etape: 'accueil', langue, ...(pilote ? { pilote: true } : {}) });
      if (status !== 200 || json.ok !== true) return traiterRefus(status, json);
      track('sondage_commence');
      const suivante = typeof json.suivante === 'string' ? (json.suivante as Etape) : 'q1';
      changerEcran(suivante);
    } catch {
      echouer(t.erreurEnregistrement, 'global');
    } finally {
      setEnvoi(false);
    }
  }

  async function valider(e: FormEvent) {
    e.preventDefault();
    if (envoi || ecran === 'accueil') return;
    const etape = ecran as Etape;

    // Contrôles locaux, doublés côté serveur.
    if (OBLIGATOIRES.includes(etape) && !(reponses[etape] as ReponseChoix | undefined)?.valeur) {
      return echouer(t.erreurObligatoire, 'choix');
    }
    if (etape === 'q9' && reponses.q9?.valeur === 'oui') {
      if (!email.trim()) return echouer(t.erreurEmailVide, 'email');
      if (!emailValide(email.trim())) return echouer(t.erreurEmailInvalide, 'email');
    }

    setEnvoi(true);
    try {
      const { status, json } = await poster(corpsEtape(etape, reponses, email));
      if (status !== 200 || json.ok !== true) return traiterRefus(status, json);
      track('sondage_etape', { etape });
      if (json.termine === true) {
        track('sondage_termine');
        setEmail('');
        changerEcran('fin');
        return;
      }
      const suivante = typeof json.suivante === 'string' ? (json.suivante as Etape) : null;
      if (suivante) changerEcran(suivante);
    } catch {
      echouer(t.erreurEnregistrement, 'global');
    } finally {
      setEnvoi(false);
    }
  }

  const titre = (texte: ReactNode, classe = 'text-2xl') => (
    <h1 ref={titreRef} tabIndex={-1} className={`${classe} font-bold text-neutral-900 focus:outline-none`}>
      {texte}
    </h1>
  );

  // Zone d'annonce : montée dès l'affichage, sur tous les écrans.
  const zoneStatut = (
    <div role="status" aria-live="polite" className="mt-4 min-h-6 text-sm">
      {erreur && (
        <p id={idErreur} key={erreur.essai} className="flex items-start gap-2 font-semibold text-warning-fg">
          <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{erreur.message}</span>
        </p>
      )}
      {!erreur && annonce && <p>{annonce}</p>}
    </div>
  );

  const bandeauPilote = pilote ? (
    <p className="mb-6 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-fg">
      {t.pilote}
    </p>
  ) : null;

  // Écrans sans formulaire.
  if (ecran === 'clos' || ecran === 'pas_encore' || ecran === 'indisponible' || ecran === 'deja' || ecran === 'fin') {
    const contenu: Record<typeof ecran, [string, string | null]> = {
      clos: [t.closTitre, t.closTexte],
      pas_encore: [t.pasOuvertTitre, null],
      indisponible: [t.indisponible, null],
      deja: [t.dejaRepondu, null],
      fin: [t.finTitre, t.finTexte],
    };
    const [h, p] = contenu[ecran];
    return (
      <div>
        {titre(h)}
        {p && <p className="mt-4 text-base text-neutral-800">{p}</p>}
        {zoneStatut}
      </div>
    );
  }

  if (ecran === 'accueil') {
    return (
      <div>
        {bandeauPilote}
        {titre(t.accueilTitre)}
        <p className="mt-4 text-base text-neutral-800">{t.accueilParagraphe1(DUREE_ANNONCEE_MINUTES)}</p>
        <p className="mt-3 text-base text-neutral-800">{t.accueilParagraphe2}</p>
        <p className="mt-3 text-base">
          <a href={lienNotice} className="text-brand-700 underline underline-offset-4 hover:text-brand-900">
            {t.lienNotice}
          </a>
        </p>
        <div className="mt-6">
          <button type="button" className={BOUTON_PRIMAIRE} onClick={commencer} disabled={envoi}>
            {envoi ? t.envoi : t.commencer}
          </button>
        </div>
        <ChampPiege piegeRef={piegeRef} libelle={t.champPiege} />
        {zoneStatut}
      </div>
    );
  }

  // Écran de question.
  const etape = ecran;
  const chemin = parcours(reponses);
  const rang = Math.max(chemin.indexOf(etape), 0) + 1;
  const total = chemin.length;
  const precedente = etapePrecedente(reponses, etape);
  const derniere = etape === 'q9';
  const erreurChoix = erreur?.champ === 'choix' || erreur?.champ === 'global';
  const progression = (
    <span className="mb-2 block text-sm font-normal text-neutral-600">{t.progression(rang, total)}</span>
  );

  let corps: ReactNode;
  if (etape === 'q5') {
    const lignes = reponses.q5?.lignes ?? {};
    corps = (
      <fieldset aria-describedby={erreurChoix && erreur ? idErreur : undefined}>
        <legend>{titre(<>{progression}{t.q5Question}</>, 'text-xl')}</legend>
        <p className="mt-2 text-sm text-neutral-600">{t.facultatif}</p>
        <div className="mt-4 space-y-5">
          {Q5_NOMS.map((nom) => (
            <fieldset key={nom} className="rounded-md border border-neutral-300 p-3">
              <legend className="px-1 text-base font-semibold text-neutral-900">{t.q5Noms[nom]}</legend>
              <div className="mt-1 space-y-2">
                {Q5_ETATS.map((etat) => (
                  <label key={etat} className={CARTE}>
                    <input
                      type="radio"
                      className={RADIO}
                      name={`${id}-q5-${nom}`}
                      value={etat}
                      checked={lignes[nom] === etat}
                      onChange={() => modifier('q5', { lignes: { ...lignes, [nom]: etat } })}
                    />
                    <span>{t.q5Etats[etat]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </fieldset>
    );
  } else if (etape === 'q8') {
    const texte = reponses.q8?.texte ?? '';
    const citation = reponses.q8?.citation ?? 'non';
    const idChamp = `${id}-q8`;
    const idCompteur = `${id}-q8-compteur`;
    corps = (
      <div>
        {titre(
          <>
            {progression}
            <label htmlFor={idChamp}>{t.q8Question}</label>
          </>,
          'text-xl',
        )}
        <p className="mt-2 text-sm text-neutral-600">{t.facultatif}</p>
        <textarea
          id={idChamp}
          className={`${CHAMP} min-h-28`}
          maxLength={Q8_MAX}
          rows={4}
          value={texte}
          aria-describedby={idCompteur}
          onChange={(e) => {
            const v = e.target.value.slice(0, Q8_MAX);
            modifier('q8', { texte: v, citation });
            if (v.length === Q8_MAX && texte.length < Q8_MAX) setAnnonce(t.q8Limite);
            else if (v.length < Q8_MAX) setAnnonce('');
          }}
        />
        <p id={idCompteur} className="mt-1 text-sm text-neutral-600">
          {t.q8Compteur(texte.length, Q8_MAX)}
        </p>
        {texte.trim() !== '' && (
          <fieldset className="mt-5">
            <legend className="text-base font-semibold text-neutral-900">{t.q8Citation}</legend>
            <div className="mt-2 space-y-2">
              {(['oui', 'non'] as const).map((v) => (
                <label key={v} className={CARTE}>
                  <input
                    type="radio"
                    className={RADIO}
                    name={`${id}-q8-citation`}
                    value={v}
                    checked={citation === v}
                    onChange={() => modifier('q8', { texte, citation: v })}
                  />
                  <span>{t.q8CitationOptions[v]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    );
  } else {
    const q = t.questions[etape as EtapeChoix];
    const rep = reponses[etape] as ReponseChoix | undefined;
    const valeur = rep?.valeur ?? null;
    const idNote = `${id}-note`;
    const avecAutre = (ETAPES_AVEC_AUTRE as readonly string[]).includes(etape);
    const idAutre = `${id}-autre`;
    const idEmail = `${id}-email`;
    const idAideEmail = `${id}-email-aide`;
    const decrit = [q.note ? idNote : null, erreurChoix && erreur ? idErreur : null].filter(Boolean).join(' ');
    corps = (
      <fieldset aria-describedby={decrit || undefined}>
        <legend>{titre(<>{progression}{q.question}</>, 'text-xl')}</legend>
        {q.note && (
          <p id={idNote} className="mt-2 text-sm text-neutral-600">
            {q.note}
          </p>
        )}
        {!OBLIGATOIRES.includes(etape) && <p className="mt-2 text-sm text-neutral-600">{t.facultatif}</p>}
        <div className="mt-4 space-y-2">
          {OPTIONS[etape as EtapeChoix].map((v) => (
            <label key={v} className={CARTE}>
              <input
                type="radio"
                className={RADIO}
                name={`${id}-${etape}`}
                value={v}
                checked={valeur === v}
                aria-invalid={erreur?.champ === 'choix' ? true : undefined}
                onChange={() =>
                  modifier(etape as EtapeChoix, avecAutre && rep?.autre ? { valeur: v, autre: rep.autre } : { valeur: v })
                }
              />
              <span>{q.options[v]}</span>
            </label>
          ))}
        </div>
        {avecAutre && valeur === 'autre' && (
          <div className="mt-4">
            <label htmlFor={idAutre} className="text-base text-neutral-900">
              {t.precisez}
            </label>
            <input
              id={idAutre}
              type="text"
              className={CHAMP}
              maxLength={AUTRE_MAX}
              value={rep?.autre ?? ''}
              onChange={(e) => modifier(etape as EtapeChoix, { valeur: 'autre', autre: e.target.value })}
            />
          </div>
        )}
        {etape === 'q9' && valeur === 'oui' && (
          <div className="mt-4">
            <label htmlFor={idEmail} className="text-base font-semibold text-neutral-900">
              {t.q9Email}
            </label>
            <p id={idAideEmail} className="mt-1 text-sm text-neutral-600">
              {t.q9EmailAide}
            </p>
            <input
              id={idEmail}
              type="email"
              inputMode="email"
              autoComplete="email"
              className={CHAMP}
              maxLength={254}
              required
              value={email}
              aria-invalid={erreur?.champ === 'email' ? true : undefined}
              aria-describedby={[idAideEmail, erreur?.champ === 'email' ? idErreur : null].filter(Boolean).join(' ')}
              onChange={(e) => {
                setEmail(e.target.value);
                if (erreur?.champ === 'email') setErreur(null);
              }}
            />
          </div>
        )}
      </fieldset>
    );
  }

  return (
    <form onSubmit={valider} noValidate>
      {bandeauPilote}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-neutral-200" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.round((rang / total) * 100)}%` }} />
      </div>
      {corps}
      {zoneStatut}
      <ChampPiege piegeRef={piegeRef} libelle={t.champPiege} />
      <div className="mt-4 flex flex-wrap gap-3">
        {precedente && (
          <button type="button" className={BOUTON_SECONDAIRE} onClick={() => changerEcran(precedente)}>
            {t.precedent}
          </button>
        )}
        <button type="submit" className={BOUTON_PRIMAIRE} disabled={envoi}>
          {envoi ? t.envoi : derniere ? t.terminer : t.suivant}
        </button>
      </div>
    </form>
  );
}

/**
 * Champ piège : invisible et hors du parcours clavier, ignoré des lecteurs
 * d'écran. Un robot qui remplit tout le remplit aussi ; la route accepte alors
 * sans rien écrire.
 */
function ChampPiege({
  piegeRef,
  libelle,
}: {
  piegeRef: React.RefObject<HTMLInputElement | null>;
  libelle: string;
}) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label>
        {libelle}
        <input ref={piegeRef} type="text" name="site" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
