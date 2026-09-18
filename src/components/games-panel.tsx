// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// PROTOTYPE LOCAL (branche proto/accueil-refonte). Textes FR en dur.
//
// Onglet discret au bord gauche, à mi-hauteur : les deux coins bas sont déjà pris
// (assistant en bas à gauche, accessibilité en bas à droite). Un clic fait glisser un
// panneau depuis la gauche.
//
// UN SEUL JEU À L'ÉCRAN. Empiler les trois obligeait à faire défiler 1 200 px en
// production et les faisait se concurrencer. Un sélecteur segmenté (tablist ARIA)
// donne toute la hauteur au jeu choisi ; les deux autres restent à un clic.
//
// Les trois panneaux restent montés, masqués par `hidden` : le jeu en cours garde sa
// partie quand on change d'onglet, et la question ne se recharge pas.
//
// Conventions reprises de src/components/search.tsx : portail vers <body> (l'entête
// porte un backdrop-filter, qui créerait un bloc conteneur pour un position:fixed rendu
// sur place), role="dialog" + aria-modal, Échap, piège de focus sur Tab, clic sur le
// fond pour fermer. En plus : le focus revient sur l'onglet à la fermeture et le
// défilement de la page est bloqué pendant l'ouverture.
//
// Cadres : le Stuut autorise `frame-ancestors 'self' https://governance.brussels`, donc
// PAS localhost. Hors production, on affiche un lien plutôt qu'un cadre vide.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X, Gamepad2, ExternalLink } from 'lucide-react';
import { DailyQuestion } from '@/components/daily-question';
import { AMAI_URLS, STUUT_URL } from '@/lib/daily-game';
// Ces actions ne naviguent pas : l'attribut `data-umami-event` n'a rien à annoter,
// et le panneau vit dans un portail monté après hydratation. L'appel explicite
// supprime toute dépendance à la liaison d'événements du tracker.
import { track } from '@/lib/analytics';

const EMBED_HOST = 'governance.brussels';

// Identités relevées le 16/09/2026 à la source : stuut.governance.brussels/assets/styles.css
// (--navy, --teal, --amber, --slate, --ink, --muted) et rendu d'amai.governance.brussels.
// Couleurs FIGÉES, jamais des tokens de thème : chaque jeu garde son fond en clair
// comme en sombre, sinon ce n'est plus son identité.
// `muted` habille les marques décoratives, `teaser` le texte. Les deux diffèrent chez
// Amai : son bleu atténué (#6A76A8) ne donne que 3,54:1 sur son propre fond, sous le
// seuil de 4,5:1. On l'éclaircit pour le texte seulement ; les points gardent la
// couleur authentique du jeu, qu'aucun sens ne repose sur eux.
const STUUT_SKIN = {
  navy: '#0E1B2A',
  accent: '#15B8A6',
  ink: '#F3F6FA',
  muted: '#9DB0C4',
  teaser: '#9DB0C4', // 7,81:1
};
const AMAI_SKIN = {
  navy: '#14204F',
  accent: '#F5C518',
  ink: '#FFFFFF',
  muted: '#6A76A8',
  teaser: '#A8B2D8', // 7,43:1
};

const STUUT_TILES = [
  { letter: 'S', bg: '#15B8A6', fg: '#0E1B2A' },
  { letter: 'T', bg: '#15B8A6', fg: '#0E1B2A' },
  { letter: 'U', bg: '#D9A04E', fg: '#0E1B2A' },
  { letter: 'U', bg: '#3A4D63', fg: '#F3F6FA' },
  { letter: 'T', bg: '#3A4D63', fg: '#F3F6FA' },
];

type Skin = typeof STUUT_SKIN;

interface Onglet {
  key: string;
  /** Libellé court, dans le sélecteur. */
  label: string;
  /** Titre plein, dans le bandeau. */
  titre: string;
  teaser: string;
  /** Absent pour la question du jour, qui est du contenu maison. */
  url?: string;
  /** Absente pour la question, qui porte les couleurs du site. */
  skin?: Skin;
  marque: ReactNode;
}

/** Les tuiles du Stuut, reprises de son écran de jeu. */
function MarqueStuut() {
  return (
    <span aria-hidden="true" className="flex shrink-0 gap-1">
      {STUUT_TILES.map((tuile, i) => (
        <span
          key={i}
          className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold"
          style={{ backgroundColor: tuile.bg, color: tuile.fg }}
        >
          {tuile.letter}
        </span>
      ))}
    </span>
  );
}

/** Les cinq points de progression d'Amai : cinq chiffres par partie. */
function MarqueAmai() {
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: i === 0 ? AMAI_SKIN.accent : AMAI_SKIN.muted }}
        />
      ))}
    </span>
  );
}

function MarqueQuestion() {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-neutral-50/15 text-sm font-bold text-neutral-50"
    >
      ?
    </span>
  );
}

// Le traducteur est passé en paramètre : cette fonction vit hors d'un composant et
// ne peut donc pas appeler useTranslations elle-même. « Amai ! » et « Le Stuut » sont
// des noms propres et restent intacts dans les quatre langues.
function ongletsFor(locale: string, t: (key: string) => string): Onglet[] {
  const amai: Onglet = {
    key: 'amai',
    label: 'Amai !',
    titre: 'Amai !',
    teaser: t('protoAmaiTeaser'),
    url: AMAI_URLS[locale] ?? AMAI_URLS.en,
    skin: AMAI_SKIN,
    marque: <MarqueAmai />,
  };
  const question: Onglet = {
    key: 'question',
    label: t('protoQuestionLabel'),
    titre: t('protoQuestionTitle'),
    teaser: t('protoQuestionTeaser'),
    marque: <MarqueQuestion />,
  };
  // Le Stuut n'existe qu'en français ; ailleurs, Amai ouvre le panneau.
  return locale === 'fr'
    ? [
        {
          key: 'stuut',
          label: 'Le Stuut',
          titre: t('protoStuutTitle'),
          teaser: t('protoStuutTeaser'),
          url: STUUT_URL,
          skin: STUUT_SKIN,
          marque: <MarqueStuut />,
        },
        amai,
        question,
      ]
    : [amai, question];
}

function Repli({ onglet }: { onglet: Onglet }) {
  const t = useTranslations('home');
  return (
    <div className="flex h-full items-center justify-center p-6">
      <p className="max-w-xs rounded-lg border border-dashed border-neutral-400 bg-neutral-100 p-4 text-center text-xs leading-relaxed text-neutral-600">
        {t('protoGamesFallback')}{' '}
        <a
          href={onglet.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
        >
          {t('protoGamesOpen', { game: onglet.titre })}
          <ExternalLink size={12} aria-hidden={true} />
        </a>
      </p>
    </div>
  );
}

export function GamesPanel({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [canEmbed, setCanEmbed] = useState(false);
  const [dateDuJour, setDateDuJour] = useState('');
  const [actif, setActif] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const boutonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const t = useTranslations('home');
  const onglets = ongletsFor(locale, t);

  // Le domaine et la date se lisent à l'ouverture, dans le gestionnaire de clic : un
  // setState posé dans un effet déclencherait un rendu en cascade, et une date calculée
  // au rendu serveur serait figée par le prérendu (react-hooks/set-state-in-effect).
  const openPanel = useCallback(() => {
    setCanEmbed(window.location.hostname === EMBED_HOST);
    setDateDuJour(
      new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
        new Date(),
      ),
    );
    setOpen(true);
    // Le jeu ouvert par défaut part avec l'événement : sans lui, on saurait combien
    // de fois le panneau s'ouvre sans savoir sur quoi il s'ouvre.
    // Seule la CLÉ du jeu part à la mesure, jamais son libellé : un événement Umami
    // doit rester identique dans les quatre langues pour être agrégeable.
    track('jeux-ouvert', { jeu: onglets[0]?.key ?? 'inconnu' });
  }, [locale, onglets]);

  // Échap ferme, où que soit le focus.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Défilement de la page bloqué pendant l'ouverture, focus rendu à l'onglet après.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    // La référence est copiée ici : au moment du nettoyage, tabRef.current peut
    // déjà pointer ailleurs (react-hooks/exhaustive-deps).
    const tab = tabRef.current;
    document.body.style.overflow = 'hidden';

    // Le focus DOIT entrer dans la modale, et le reste de la page DOIT devenir
    // inerte. Sans cela, `aria-modal="true"` ment : mesuré avant correction, le
    // focus restait sur <body> et 141 éléments demeuraient focalisables derrière
    // le panneau, dont toute la navigation. Le piège de focus ne servait à rien,
    // puisqu'il ne s'arme qu'une fois le focus à l'intérieur.
    const panneau = panelRef.current;
    const portail = panneau?.parentElement ?? null;
    panneau?.querySelector<HTMLElement>('button, a[href]')?.focus();

    const voisins = [...document.body.children].filter(
      (el): el is HTMLElement => el !== portail && el instanceof HTMLElement,
    );
    for (const el of voisins) el.setAttribute('inert', '');

    return () => {
      document.body.style.overflow = previous;
      // L'inertie est levée AVANT de rendre le focus : un élément inerte ne peut
      // pas le recevoir, et l'onglet fait partie de l'arrière-plan.
      for (const el of voisins) el.removeAttribute('inert');
      tab?.focus();
    };
  }, [open]);

  // Flèches, Début et Fin dans le sélecteur, comme le veut le motif ARIA « tabs ».
  const naviguerOnglets = useCallback(
    (e: React.KeyboardEvent) => {
      const n = onglets.length;
      let cible = -1;
      if (e.key === 'ArrowRight') cible = (actif + 1) % n;
      else if (e.key === 'ArrowLeft') cible = (actif - 1 + n) % n;
      else if (e.key === 'Home') cible = 0;
      else if (e.key === 'End') cible = n - 1;
      if (cible < 0) return;
      e.preventDefault();
      setActif(cible);
      boutonsRef.current[cible]?.focus();
    },
    [actif, onglets.length],
  );

  const trapFocus = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = [
      ...panelRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], iframe, [tabindex]:not([tabindex="-1"])',
      ),
      // Les panneaux inactifs sont masqués : leurs boutons ne doivent pas piéger le focus.
    ].filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  return (
    <>
      {/* Toujours disponible, à toutes les largeurs, en onglet centré au bord gauche.
          Icône seule au repos : 36 px contre 58 px pour l'ancienne étiquette verticale.
          Le mot se déplie horizontalement au survol et au focus — un texte pivoté à 90°
          se lit nettement moins vite.

          Ne pas le déplacer en bouton flottant « pour éviter les chevauchements » : c'est
          un détour déjà pris et mesuré. Sous 1 096 px le contenu occupe toute la largeur,
          donc TOUT élément flottant recouvre quelque chose. Relevé à 390 px : 7 positions
          de défilement sur 10 pour cet onglet, et 7 sur 10 pour le bouton du chat, en
          place de longue date et jamais signalé. Déplacer ne change pas le nombre, cela
          change seulement ce qui est recouvert. */}
      <button
        ref={tabRef}
        type="button"
        onClick={openPanel}
        aria-expanded={open}
        aria-label={t('protoGamesTab')}
        className="group fixed left-0 top-1/2 z-[60] flex -translate-y-1/2 items-center rounded-r-lg bg-brand-900 py-3 pl-2 pr-2 text-neutral-50 shadow-lg transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 print:hidden"
      >
        <Gamepad2 size={20} aria-hidden={true} />
        <span
          aria-hidden="true"
          className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-[max-width,padding] duration-200 group-hover:max-w-24 group-hover:pl-2 group-focus-visible:max-w-24 group-focus-visible:pl-2"
        >
          {t('protoGamesTab')}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="jeux-titre"
              onKeyDown={trapFocus}
              // 560 px et non 440 : le Stuut dimensionne ses cases en divisant la
              // largeur par le nombre de lettres, et son mot du jour peut faire
              // treize caractères. À 440 px les cases tombaient à 24 px, illisibles.
              // Mesuré le 18/09/2026 : 440 px donne 28 px de case, 560 px en donne 37.
              className="flex h-full w-full flex-col overflow-hidden bg-neutral-50 shadow-2xl sm:w-[560px]"
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <h2 id="jeux-titre" className="text-base font-semibold text-neutral-900">
                    {t('protoGamesTitle')}
                  </h2>
                  {/* first-letter, pas capitalize : « Mercredi 16 septembre », pas
                      « Mercredi 16 Septembre ». Le français ne capitalise ni le mois ni le jour. */}
                  <p className="text-xs text-neutral-600 first-letter:uppercase">{dateDuJour}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('protoGamesClose')}
                  className="-mr-1 rounded-md p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                >
                  <X size={18} aria-hidden={true} />
                </button>
              </div>

              <div
                role="tablist"
                aria-label={t('protoGamesChoose')}
                onKeyDown={naviguerOnglets}
                // Pas de filet sous la barre : il couperait l'onglet actif du bandeau,
                // qui porte le même bleu nuit. L'onglet doit sembler attaché à son jeu.
                className="flex gap-1 px-3"
              >
                {onglets.map((onglet, i) => {
                  const choisi = i === actif;
                  return (
                    <button
                      key={onglet.key}
                      ref={(el) => {
                        boutonsRef.current[i] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`jeu-onglet-${onglet.key}`}
                      aria-selected={choisi}
                      aria-controls={`jeu-panneau-${onglet.key}`}
                      tabIndex={choisi ? 0 : -1}
                      onClick={() => {
                        setActif(i);
                        track('jeux-onglet', { jeu: onglet.key });
                      }}
                      style={
                        choisi && onglet.skin
                          ? {
                              backgroundColor: onglet.skin.navy,
                              color: onglet.skin.ink,
                              boxShadow: `inset 0 -3px 0 ${onglet.skin.accent}`,
                            }
                          : undefined
                      }
                      className={`cursor-pointer rounded-t-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-700 ${
                        choisi
                          ? onglet.skin
                            ? ''
                            : 'bg-brand-900 text-neutral-50 shadow-[inset_0_-3px_0] shadow-brand-200'
                          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      {onglet.label}
                    </button>
                  );
                })}
              </div>

              {onglets.map((onglet, i) => (
                <div
                  key={onglet.key}
                  role="tabpanel"
                  id={`jeu-panneau-${onglet.key}`}
                  aria-labelledby={`jeu-onglet-${onglet.key}`}
                  className={i === actif ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
                >
                  <div
                    className={`flex items-center gap-3 px-4 py-3 ${
                      onglet.skin ? '' : 'bg-brand-900'
                    }`}
                    style={onglet.skin ? { backgroundColor: onglet.skin.navy } : undefined}
                  >
                    {onglet.marque}
                    <div className="min-w-0">
                      <h3
                        className={`truncate text-sm font-semibold ${
                          onglet.skin ? '' : 'text-neutral-50'
                        }`}
                        style={onglet.skin ? { color: onglet.skin.ink } : undefined}
                      >
                        {onglet.titre}
                      </h3>
                      <p
                        className={`truncate text-xs ${onglet.skin ? '' : 'text-neutral-50/75'}`}
                        style={onglet.skin ? { color: onglet.skin.teaser } : undefined}
                      >
                        {onglet.teaser}
                      </p>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {onglet.url ? (
                      canEmbed ? (
                        <iframe
                          src={onglet.url}
                          title={onglet.titre}
                          loading="lazy"
                          // Sans cet attribut, le navigateur REFUSE ces deux permissions
                          // à un cadre d'origine différente, et il le fait en silence.
                          // Les deux jeux partagent le score : Amai appelle
                          // navigator.clipboard.writeText, le Stuut appelle
                          // navigator.share puis se replie sur le presse-papiers.
                          // Constaté le 18/09/2026 : « Partager mon score » ne faisait
                          // rien du tout dans le panneau, sans message ni erreur en
                          // console, alors qu'il fonctionne en jeu autonome.
                          allow="clipboard-write; web-share"
                          className="h-full w-full border-0 bg-neutral-100"
                        />
                      ) : (
                        <Repli onglet={onglet} />
                      )
                    ) : (
                      // Carte compacte, PAS étirée sur la hauteur : essayé, et h-full
                      // envoie « Faire le quiz complet » seul tout en bas, à 400 px des
                      // réponses. Le vide sous une carte courte se lit mieux.
                      <div className="p-4">
                        <DailyQuestion locale={locale} showHeading={false} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
