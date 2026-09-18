// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// Le Stuut du jour, joué NATIVEMENT dans le panneau de jeux (plus d'iframe).
//
// Le mot vient de stuut.governance.brussels/api/jour, déjà résolu par le même
// chargeur que le jeu autonome et le digest de 7h15 : voir src/lib/stuut.ts pour
// la raison de ne pas recopier la banque. Ce composant ne porte que l'interface.
//
// Repris du jeu autonome : plateau, clavier AZERTY, première lettre offerte,
// leurre du jour, révélation avec définition et lien vers le dossier, partage,
// défi entre amis (le lien pointe vers le jeu autonome, seul à le lire),
// statistiques locales, inscription au mail quotidien (stuut-inscription.tsx :
// invitation en fin de partie, et bouton de l'en-tête).
// Laissé au jeu autonome : la réception des défis.
//
// Accessibilité : le plateau est un dessin (aria-hidden) doublé d'une liste
// textuelle des essais pour les lecteurs d'écran, et chaque essai évalué est
// annoncé dans une région live. Les touches du clavier portent leur verdict en
// toutes lettres, jamais par la seule couleur.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ExternalLink } from 'lucide-react';
import { track } from '@/lib/analytics';
import { policeStuut } from '@/lib/fonts-jeux';
import {
  CLAVIER,
  CLE_INSCRIT,
  CLE_INVITATION,
  CLE_PSEUDO,
  CLE_STATS,
  MAX_ESSAIS,
  NB_VARIANTES,
  STUUT_API_JOUR,
  STUUT_SITE,
  assainirPseudo,
  caseMax,
  doitInviter,
  encoderDefi,
  enregistrer,
  estStuutJour,
  etatTouches,
  evaluer,
  grilleDepuisEvals,
  interstice,
  lienDefi,
  lienInterne,
  lireStats,
  norm,
  texteDefi,
  texteResultat,
  verdictFinal,
  type ResultatDuJour,
  type StuutJour,
  type StuutStats,
  type Verdict,
} from '@/lib/stuut';
import { StuutInscription, type SourceInscription } from './stuut-inscription';
import s from './stuut-game.module.css';

type Chargement = { etat: 'chargement' } | { etat: 'erreur' } | { etat: 'pret'; jour: StuutJour };

const LIBELLE: Record<Verdict, string> = {
  correct: 'bien placée',
  present: 'ailleurs dans le mot',
  absent: 'absente',
};

function lireStockage(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrireStockage(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    // navigation privée, stockage plein : le jeu reste jouable, rien n'est retenu
  }
}

/**
 * Décide, une fois par fin de partie, si l'invitation à l'e-mail s'affiche, et
 * l'horodate si oui. Même règle que le jeu autonome (newsletter-flow.mjs) : jamais
 * pour un appareil inscrit, et une fois tous les trois jours au plus.
 */
function decideInvitation(): boolean {
  const oui = doitInviter({
    inscrit: lireStockage(CLE_INSCRIT) === '1',
    derniereInvitation: lireStockage(CLE_INVITATION) === null ? null : Number(lireStockage(CLE_INVITATION)),
    maintenant: Date.now(),
  });
  if (oui) ecrireStockage(CLE_INVITATION, String(Date.now()));
  return oui;
}

/** Sans animation quand l'utilisateur l'a demandé, ou quand rien ne permet de le savoir (tests). */
function sansAnimation(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function StuutGame({ actif }: { actif: boolean }) {
  const [donnees, setDonnees] = useState<Chargement>({ etat: 'chargement' });
  const [tentative, setTentative] = useState(0);
  const [essais, setEssais] = useState<string[]>([]);
  const [evals, setEvals] = useState<Verdict[][]>([]);
  const [saisie, setSaisie] = useState('');
  const [verrou, setVerrou] = useState(false);
  const [fini, setFini] = useState<ResultatDuJour | null>(null);
  const [stats, setStats] = useState<StuutStats | null>(null);
  const [vueStats, setVueStats] = useState(false);
  const [inviter, setInviter] = useState(false);
  const [inscriptionOuverte, setInscriptionOuverte] = useState(false);
  // L'état d'inscription vit ICI, pas dans chaque formulaire : les deux (en-tête et
  // fin de partie) doivent le partager. Sinon une inscription par l'en-tête laissait
  // l'invitation de fin de partie affichée (constat F7 de l'équipe rouge).
  const [appareilInscrit, setAppareilInscrit] = useState(false);
  const [reussie, setReussie] = useState<SourceInscription | null>(null);
  const surInscription = useCallback((source: SourceInscription) => {
    ecrireStockage(CLE_INSCRIT, '1');
    setAppareilInscrit(true);
    setReussie(source);
  }, []);
  const [secousse, setSecousse] = useState(0);
  const [message, setMessage] = useState('');
  const [annonce, setAnnonce] = useState('');
  const [defiOuvert, setDefiOuvert] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const minuterie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revelationRef = useRef<HTMLDivElement>(null);
  const racineRef = useRef<HTMLDivElement>(null);

  // Chargement du mot. Les setState sont dans les rappels de la promesse, pas
  // dans le corps de l'effet (react-hooks/set-state-in-effect).
  useEffect(() => {
    let abandon = false;
    fetch(STUUT_API_JOUR)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: unknown) => {
        if (abandon) return;
        if (!estStuutJour(d)) throw new Error('réponse inattendue');
        const st = lireStats(lireStockage(CLE_STATS));
        setStats(st);
        // Déjà joué aujourd'hui sur cet appareil : on retrouve l'écran de
        // résultat, pas un plateau vide rejouable.
        if (st.today && st.today.day === d.numero - 1) {
          setFini(st.today);
          setInviter(decideInvitation());
        }
        setDonnees({ etat: 'pret', jour: d });
      })
      .catch(() => {
        if (!abandon) setDonnees({ etat: 'erreur' });
      });
    return () => {
      abandon = true;
    };
  }, [tentative]);

  const dire = useCallback((texte: string) => {
    setMessage(texte);
    setAnnonce(texte);
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setMessage(''), 2300);
  }, []);
  useEffect(() => () => clearTimeout(minuterie.current), []);

  const jour = donnees.etat === 'pret' ? donnees.jour : null;
  const solution = jour ? norm(jour.mot) : '';
  const longueur = solution.length;
  const initiale = solution[0] ?? '';
  const enJeu = jour !== null && fini === null && !verrou;

  const terminer = useCallback(
    (gagne: boolean, evalsFinales: Verdict[][]) => {
      if (!jour) return;
      const resultat: ResultatDuJour = {
        day: jour.numero - 1,
        won: gagne,
        n: gagne ? evalsFinales.length : 0,
        grid: grilleDepuisEvals(evalsFinales),
      };
      const suivantes = enregistrer(lireStats(lireStockage(CLE_STATS)), resultat);
      ecrireStockage(CLE_STATS, JSON.stringify(suivantes));
      setStats(suivantes);
      setFini(resultat);
      setInviter(decideInvitation());
      setAnnonce(`${verdictFinal(resultat)} Le mot était ${jour.mot}.`);
      track('jeux-stuut-termine', { resultat: gagne ? 'gagne' : 'perdu', essais: resultat.n });
    },
    [jour],
  );

  const taper = useCallback(
    (lettre: string) => {
      if (!enJeu) return;
      setSaisie((x) => (x.length < longueur - 1 ? x + lettre : x));
    },
    [enJeu, longueur],
  );

  const effacer = useCallback(() => {
    if (!enJeu) return;
    setSaisie((x) => x.slice(0, -1));
  }, [enJeu]);

  const valider = useCallback(() => {
    if (!enJeu || !jour) return;
    if (saisie.length < longueur - 1) {
      setSecousse((n) => n + 1);
      dire('Il manque des lettres');
      return;
    }
    const essai = initiale + saisie;
    const res = evaluer(essai, solution);
    const nouveauxEssais = [...essais, essai];
    const nouvellesEvals = [...evals, res];
    setEssais(nouveauxEssais);
    setEvals(nouvellesEvals);
    setSaisie('');
    setVerrou(true);

    const detail = [...essai].map((l, i) => `${l} ${LIBELLE[res[i]]}`).join(', ');
    const appat = jour.appat ? norm(jour.appat) : null;
    // Le leurre : un clin d'œil sur le mot, jamais une sanction. La partie continue.
    if (appat && essai === appat && essai !== solution) {
      dire(`${appat}, le grand classique du genre. Pas pour aujourd'hui.`);
    }
    setAnnonce(`Essai ${nouveauxEssais.length} sur ${MAX_ESSAIS} : ${essai}. ${detail}.`);

    const delai = sansAnimation() ? 0 : longueur * 220 + 350;
    setTimeout(() => {
      setVerrou(false);
      if (essai === solution) terminer(true, nouvellesEvals);
      else if (nouveauxEssais.length >= MAX_ESSAIS) terminer(false, nouvellesEvals);
    }, delai);
  }, [enJeu, jour, saisie, longueur, initiale, solution, essais, evals, dire, terminer]);

  const appuyer = useCallback(
    (touche: string) => {
      if (touche === 'ENTRER') valider();
      else if (touche === 'RETOUR') effacer();
      else taper(touche);
    },
    [valider, effacer, taper],
  );

  // Clavier physique, seulement quand l'onglet du Stuut est à l'écran : les
  // trois jeux restent montés, et une frappe destinée à un autre ne doit pas
  // remplir ce plateau.
  useEffect(() => {
    if (!actif) return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const cible = e.target as HTMLElement | null;
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
      // Entrée sur un bouton ou un lien : c'est lui que l'on active, pas l'essai.
      if (e.key === 'Enter' && cible && /^(BUTTON|A|SUMMARY)$/.test(cible.tagName)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        valider();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        effacer();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        // Le jeu prend le focus dès la première lettre. Sans cela, à l'ouverture du
        // panneau le focus est sur « Fermer », et l'Entrée qui suit la saisie
        // activait CE bouton : le panneau se fermait sur l'essai. Constaté au
        // navigateur le 18/09/2026. Qui choisit « Fermer » au clavier (Tab) sans
        // taper de lettre le ferme toujours.
        const racine = racineRef.current;
        if (racine && !racine.contains(document.activeElement)) racine.focus({ preventScroll: true });
        taper(e.key.toUpperCase());
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [actif, valider, effacer, taper]);

  // La révélation naît sous le plateau : on l'amène au lecteur.
  useEffect(() => {
    if (fini && essais.length > 0) revelationRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [fini, essais.length]);

  const partager = useCallback(async () => {
    if (!jour || !fini) return;
    try {
      await navigator.clipboard.writeText(texteResultat(jour.numero, fini));
      dire('Résultat copié');
      track('jeux-stuut-partage');
    } catch {
      dire('Copie indisponible ici');
    }
  }, [jour, fini, dire]);

  const defier = useCallback(async () => {
    if (!jour || !fini) return;
    const p = assainirPseudo(pseudo);
    if (p) ecrireStockage(CLE_PSEUDO, p);
    const variante = Math.floor(Math.random() * NB_VARIANTES);
    const url = lienDefi(encoderDefi({ jour: jour.jour, n: fini.n, pseudo: p, grid: fini.grid, variante }));
    const texte = texteDefi(fini, url, variante);
    // Comptabilisé seulement sur un envoi réel : une annulation ne doit pas
    // gonfler le seul indicateur d'acquisition du jeu.
    const compter = () => {
      track('jeux-stuut-defi', { essais: fini.n });
      setDefiOuvert(false);
    };
    if (navigator.share) {
      try {
        await navigator.share({ text: texte });
        compter();
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(texte);
      dire('Lien de défi copié');
      compter();
    } catch {
      dire('Partage indisponible ici');
    }
  }, [jour, fini, pseudo, dire]);

  const ouvrirDefi = useCallback(() => {
    setPseudo(assainirPseudo(lireStockage(CLE_PSEUDO)) ?? '');
    setDefiOuvert(true);
  }, []);

  if (donnees.etat !== 'pret' || !jour) {
    return (
      <div className={s.racine}>
        {donnees.etat === 'chargement' ? (
          <p className={s.erreur} role="status">
            Chargement du mot du jour…
          </p>
        ) : (
          <div className={s.erreur} role="alert">
            <p>Le Stuut du jour n&apos;a pas pu être chargé.</p>
            <p className="mt-3 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className={`${s.bouton} ${s.primaire}`}
                onClick={() => {
                  setDonnees({ etat: 'chargement' });
                  setTentative((n) => n + 1);
                }}
              >
                Réessayer
              </button>
              <a className={s.lien} href={STUUT_SITE} target="_blank" rel="noopener noreferrer">
                Jouer sur stuut.governance.brussels
                <ExternalLink size={12} aria-hidden={true} className="ml-1 inline" />
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Les touches ne prennent leur couleur qu'une fois l'essai retourné à l'écran.
  const touches = etatTouches(verrou ? essais.slice(0, -1) : essais, evals);
  const ligneCourante = essais.length;
  const varsPlateau = {
    '--n': longueur,
    '--rg': `${interstice(longueur)}px`,
    '--cmax': `${caseMax(longueur)}px`,
  } as CSSProperties;
  const statsAffichees = stats ?? lireStats(null);
  const maxDist = Math.max(1, ...statsAffichees.dist);
  const rejoue = fini !== null && essais.length === 0;

  return (
    // tabIndex -1 : focalisable par script seulement (voir la saisie au clavier
    // physique), jamais une étape de plus dans l'ordre de tabulation.
    <div ref={racineRef} className={s.racine} tabIndex={-1} aria-label="Le Stuut du jour" role="region">
      <p aria-live="polite" className="sr-only">
        {annonce}
      </p>
      {message && (
        <div className={s.message} aria-hidden="true">
          {message}
        </div>
      )}

      <div className={s.entete}>
        <span>
          n°{jour.numero} · {longueur} lettres
        </span>
        <span className="flex gap-3">
          {/* Toujours à portée, comme l'enveloppe de l'en-tête du jeu autonome : l'invitation
              de fin de partie, elle, ne revient qu'une fois tous les trois jours. */}
          <button
            type="button"
            className={s.lien}
            onClick={() => {
              if (lireStockage(CLE_INSCRIT) === '1') setAppareilInscrit(true);
              setInscriptionOuverte((v) => !v);
            }}
            aria-expanded={inscriptionOuverte}
          >
            Recevoir par e-mail
          </button>
          <button type="button" className={s.lien} onClick={() => setVueStats((v) => !v)} aria-expanded={vueStats}>
            Mes statistiques
          </button>
        </span>
      </div>

      {inscriptionOuverte && (
        <StuutInscription
          source="entete"
          dejaInscrit={appareilInscrit && reussie !== 'entete'}
          reussie={reussie === 'entete'}
          focusALOuverture
          onInscrit={surInscription}
        />
      )}

      {!fini && (
        <details className={s.aide}>
          <summary>Comment jouer</summary>
          <p>
            Trouvez le mot du jour de la gouvernance bruxelloise en six essais. La première lettre vous est
            offerte, les accents sont ignorés.
          </p>
          <div className={s.legende}>
            <span>
              <span className={s.pastille} style={{ background: '#15B8A6' }} aria-hidden="true" /> bonne place
            </span>
            <span>
              <span className={s.pastille} style={{ background: '#D9A04E' }} aria-hidden="true" /> ailleurs dans le mot
            </span>
            <span>
              <span className={s.pastille} style={{ background: '#3A4D63' }} aria-hidden="true" /> absente
            </span>
          </div>
        </details>
      )}

      {vueStats && (
        <section className={s.stats} aria-labelledby="stuut-stats-titre">
          <h4 id="stuut-stats-titre">Mes statistiques</h4>
          <dl className={s.chiffres}>
            <div>
              <dt>parties</dt>
              <dd className={policeStuut.className}>{statsAffichees.played}</dd>
            </div>
            <div>
              <dt>% réussite</dt>
              <dd className={policeStuut.className}>
                {statsAffichees.played ? Math.round((100 * statsAffichees.wins) / statsAffichees.played) : 0}
              </dd>
            </div>
            <div>
              <dt>série</dt>
              <dd className={policeStuut.className}>{statsAffichees.streak}</dd>
            </div>
            <div>
              <dt>record</dt>
              <dd className={policeStuut.className}>{statsAffichees.max}</dd>
            </div>
          </dl>
          <h4 className="mt-4">Répartition des essais</h4>
          <ol className={s.repartition}>
            {statsAffichees.dist.map((n, i) => (
              <li key={i} className={s.barre}>
                <span aria-hidden="true">{i + 1}</span>
                <span className="sr-only">
                  {i + 1} essai{i ? 's' : ''} : {n} partie{n > 1 ? 's' : ''}
                </span>
                <span className={s.piste} aria-hidden="true">
                  <span
                    className={`${s.remplissage} ${fini?.won && fini.n === i + 1 ? s.chaud : ''}`}
                    style={{ width: `${Math.max(8, (100 * n) / maxDist)}%` }}
                  >
                    {n}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs" style={{ color: '#9DB0C4' }}>
            Vos résultats restent sur cet appareil, et ne se croisent pas avec ceux du jeu sur
            stuut.governance.brussels.
          </p>
        </section>
      )}

      {!rejoue && (
        <>
          <div className={s.plateau} style={varsPlateau} aria-hidden="true">
            {Array.from({ length: MAX_ESSAIS }, (_, r) => {
              const evaluee = r < essais.length;
              // Chaque ligne porte la lettre offerte, comme dans le jeu autonome.
              const lettres = evaluee ? essais[r] : r === ligneCourante && !fini ? initiale + saisie : initiale;
              return (
                <div
                  key={r === ligneCourante ? `l${r}-${secousse}` : `l${r}`}
                  className={`${s.ligne} ${r === ligneCourante && secousse > 0 ? s.secoue : ''}`}
                >
                  {Array.from({ length: longueur }, (_, c) => {
                    const l = lettres[c] ?? '';
                    const classes = [s.case];
                    if (evaluee) classes.push(s.revelee, s[evals[r][c]]);
                    else if (c === 0 && l) classes.push(s.initiale);
                    else if (l) classes.push(s.remplie);
                    return (
                      <div key={c} className={classes.join(' ')} style={{ '--i': c } as CSSProperties}>
                        {l}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="sr-only">
            <p>
              Mot de {longueur} lettres, commençant par {initiale}.
              {fini ? '' : ` Saisie en cours : ${initiale}${saisie}.`}
            </p>
            {essais.length > 0 && (
              <ol>
                {essais.map((essai, r) => (
                  <li key={r}>
                    {essai} : {[...essai].map((l, i) => `${l} ${LIBELLE[evals[r][i]]}`).join(', ')}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}

      {!fini && (
        <div className={s.clavier} role="group" aria-label="Clavier du jeu">
          {CLAVIER.map((rangee, i) => (
            <div key={i} className={s.rangee}>
              {rangee.map((t) => {
                const large = t === 'ENTRER' || t === 'RETOUR';
                const etat = large ? undefined : touches[t];
                return (
                  <button
                    key={t}
                    type="button"
                    className={`${s.touche} ${large ? s.large : ''} ${etat ? s[etat] : ''}`}
                    // Pas de focus au clic de souris : sinon la touche garde le focus,
                    // et la touche Entrée du clavier physique la réactiverait au lieu
                    // de valider l'essai. Le focus au clavier (Tab) reste intact.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => appuyer(t)}
                    aria-label={
                      t === 'ENTRER' ? 'Valider l’essai' : t === 'RETOUR' ? 'Effacer une lettre' : etat ? `${t}, ${LIBELLE[etat]}` : t
                    }
                  >
                    {t === 'ENTRER' ? 'ENTRER' : t === 'RETOUR' ? '⌫' : t}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {fini && (
        <div ref={revelationRef} className={s.revelation}>
          <p className={`${s.verdict} ${policeStuut.className}`}>
            {rejoue ? 'Vous avez déjà joué aujourd’hui. ' : ''}
            {verdictFinal(fini)}
          </p>
          <p className={`${s.mot} ${policeStuut.className}`}>{jour.mot}</p>
          <p className={s.definition}>
            {fini.won ? '' : 'Même les initiés sèchent parfois. '}
            {jour.definition}
          </p>
          <a className={s.carte} href={lienInterne(jour.url)} data-umami-event="jeux-stuut-dossier">
            <span className={s.carteCorps}>
              <span className={s.surtitre}>Pour aller plus loin</span>
              <span className={s.carteTitre}>Comprendre « {jour.mot} » et la gouvernance bruxelloise</span>
            </span>
            <span aria-hidden="true" style={{ color: '#15B8A6' }}>
              →
            </span>
          </a>

          <div className={s.actions}>
            <button type="button" className={`${s.bouton} ${s.primaire}`} onClick={ouvrirDefi} aria-expanded={defiOuvert}>
              Défier un ami
            </button>
            <button type="button" className={s.bouton} onClick={partager}>
              Copier mon résultat
            </button>
          </div>

          {defiOuvert && (
            <form
              className={s.defi}
              onSubmit={(e) => {
                e.preventDefault();
                void defier();
              }}
            >
              <label>
                Votre prénom dans le défi (facultatif)
                <input
                  className={s.champ}
                  value={pseudo}
                  maxLength={20}
                  autoComplete="nickname"
                  onChange={(e) => setPseudo(e.target.value)}
                />
              </label>
              <button type="submit" className={`${s.bouton} ${s.primaire}`}>
                Envoyer le défi
              </button>
            </form>
          )}

          {/* Plus d'invitation une fois inscrit par l'en-tête ; la confirmation, elle,
              reste affichée là où l'inscription a abouti. */}
          {inviter && reussie !== 'entete' && (
            <StuutInscription
              source="fin-partie"
              dejaInscrit={false}
              reussie={reussie === 'fin-partie'}
              onInscrit={surInscription}
            />
          )}

          <p className="mt-4 text-sm" style={{ color: '#9DB0C4' }}>
            Un nouveau mot demain, à minuit.
          </p>
        </div>
      )}
    </div>
  );
}
