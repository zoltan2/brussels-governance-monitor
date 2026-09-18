// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

// Amai ! joué NATIVEMENT dans le panneau de jeux (plus d'iframe).
//
// Portage en TypeScript du widget du jeu (zoltan2/amai, widget/AmaiWidget.jsx),
// branché sur la même API : amai.governance.brussels/api/daily et /api/plays,
// qui autorisent déjà https://governance.brussels en CORS. Les questions, les
// scores et le percentile sont donc ceux du jeu autonome.
//
// Écarts assumés avec le widget :
//   - polices : Archivo par next/font (src/lib/fonts-jeux.ts), Inter du site
//     pour le texte courant, à la place de Public Sans ;
//   - le bleu atténué (#6A76A8) ne sert plus au texte sur la carte blanche :
//     4,4:1, sous le seuil de 4,5:1. Remplacé par #5A6696 (5,4:1) ;
//   - les liens vers governance.brussels deviennent relatifs (même onglet) ;
//   - le compteur animé s'efface devant `prefers-reduced-motion`.
//
// La série (🔥) vit dans le localStorage de governance.brussels : elle ne se
// croise pas avec celle du jeu autonome, qui a sa propre origine.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { track } from '@/lib/analytics';
import { AMAI_API, AMAI_URLS, lienJeuDepuisBgm } from '@/lib/daily-game';
import { policeAmai } from '@/lib/fonts-jeux';
import s from './amai-game.module.css';

type Langue = 'fr' | 'nl' | 'en' | 'de';

interface Question {
  id: number;
  anchor: number;
  real: number;
  unit: string;
  tag: string;
  source_url?: string | null;
  question: string;
  ctx: string;
}
interface Partie {
  date: string;
  questions: Question[];
}
interface Reponse {
  questionId: number;
  correct: boolean;
}

const LOCALES: Record<Langue, string> = { fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB', de: 'de-BE' };

const BAROMETRE: Record<Langue, string> = {
  fr: '/fr/engagements',
  nl: '/nl/engagementen',
  en: '/en/commitments',
  de: '/de/verpflichtungen',
};

const UI = {
  fr: {
    subtitle: 'Le chiffre du jour', anchorLabel: 'Plus ou moins que…',
    less: '− Moins', more: '+ Plus', correct: '✔ Bien vu', wrong: '✘ Raté',
    next: 'Chiffre suivant', seeScore: 'Voir mon score',
    resultTag: 'Résultat', quipHigh: '— straffe kop !', quipMid: '— pas mal, fieu.', quipLow: '— amai, faut lire BGM !',
    outro: 'Reviens demain pour 5 nouveaux chiffres — et garde ta série 🔥 vivante.',
    share: 'Partager mon score', copied: 'Copié ✔', copyFailed: 'Copie impossible ici', explore: 'Explorer le Baromètre BGM →',
    tomorrow: 'Prochain « Amai ! » demain à minuit.', source: 'Source',
    percentile: (p: number) => `Mieux que ${p}% des lecteurs aujourd'hui.`,
    loading: 'Chargement du chiffre du jour…', error: 'Impossible de charger le jeu.', retry: 'Réessayer',
    streak: (n: number) => `Série : ${n} jour${n > 1 ? 's' : ''}`,
    progress: (i: number) => `Chiffre ${i} sur 5`,
  },
  nl: {
    subtitle: 'Het cijfer van de dag', anchorLabel: 'Meer of minder dan…',
    less: '− Minder', more: '+ Meer', correct: '✔ Goed gezien', wrong: '✘ Mis',
    next: 'Volgend cijfer', seeScore: 'Mijn score bekijken',
    resultTag: 'Resultaat', quipHigh: '— straffe kop!', quipMid: '— nie slecht, fieu.', quipLow: '— amai, tijd om BGM te lezen!',
    outro: 'Kom morgen terug voor 5 nieuwe cijfers — en hou je reeks 🔥 in leven.',
    share: 'Mijn score delen', copied: 'Gekopieerd ✔', copyFailed: 'Kopiëren hier niet mogelijk', explore: 'Ontdek de BGM-Barometer →',
    tomorrow: 'Volgende « Amai! » morgen om middernacht.', source: 'Bron',
    percentile: (p: number) => `Beter dan ${p}% van de lezers vandaag.`,
    loading: 'Cijfer van de dag laden…', error: 'Het spel kon niet geladen worden.', retry: 'Opnieuw proberen',
    streak: (n: number) => `Reeks: ${n} dag${n > 1 ? 'en' : ''}`,
    progress: (i: number) => `Cijfer ${i} van 5`,
  },
  en: {
    subtitle: "Today's figure", anchorLabel: 'Higher or lower than…',
    less: '− Lower', more: '+ Higher', correct: '✔ Well spotted', wrong: '✘ Missed',
    next: 'Next figure', seeScore: 'See my score',
    resultTag: 'Result', quipHigh: '— straffe kop!', quipMid: '— not bad at all.', quipLow: '— amai, time to read BGM!',
    outro: 'Come back tomorrow for 5 new figures — and keep your 🔥 streak alive.',
    share: 'Share my score', copied: 'Copied ✔', copyFailed: 'Copy unavailable here', explore: 'Explore the BGM Barometer →',
    tomorrow: 'Next “Amai!” tomorrow at midnight.', source: 'Source',
    percentile: (p: number) => `Better than ${p}% of today's readers.`,
    loading: "Loading today's figure…", error: 'The game could not be loaded.', retry: 'Retry',
    streak: (n: number) => `Streak: ${n} day${n > 1 ? 's' : ''}`,
    progress: (i: number) => `Figure ${i} of 5`,
  },
  de: {
    subtitle: 'Die Zahl des Tages', anchorLabel: 'Mehr oder weniger als…',
    less: '− Weniger', more: '+ Mehr', correct: '✔ Gut erkannt', wrong: '✘ Daneben',
    next: 'Nächste Zahl', seeScore: 'Mein Ergebnis ansehen',
    resultTag: 'Ergebnis', quipHigh: '— straffe kop!', quipMid: '— gar nicht schlecht.', quipLow: '— amai, Zeit, BGM zu lesen!',
    outro: 'Komm morgen für 5 neue Zahlen zurück — und halte deine 🔥-Serie am Leben.',
    share: 'Ergebnis teilen', copied: 'Kopiert ✔', copyFailed: 'Kopieren hier nicht möglich', explore: 'Das BGM-Barometer entdecken →',
    tomorrow: 'Nächstes „Amai!“ morgen um Mitternacht.', source: 'Quelle',
    percentile: (p: number) => `Besser als ${p}% der heutigen Leser.`,
    loading: 'Zahl des Tages wird geladen…', error: 'Das Spiel konnte nicht geladen werden.', retry: 'Erneut versuchen',
    streak: (n: number) => `Serie: ${n} Tag${n > 1 ? 'e' : ''}`,
    progress: (i: number) => `Zahl ${i} von 5`,
  },
};

const UNITS: Record<string, Record<Langue, string>> = {
  days: { fr: 'jours', nl: 'dagen', en: 'days', de: 'Tage' },
  municipalities: { fr: 'communes', nl: 'gemeenten', en: 'municipalities', de: 'Gemeinden' },
  mps: { fr: 'députés', nl: 'parlementsleden', en: 'MPs', de: 'Abgeordnete' },
  households: { fr: 'ménages', nl: 'gezinnen', en: 'households', de: 'Haushalte' },
  meur: { fr: 'millions €', nl: 'miljoen €', en: 'million €', de: 'Mio. €' },
  zones: { fr: 'zones', nl: 'zones', en: 'zones', de: 'Zonen' },
  pct: { fr: '%', nl: '%', en: '%', de: '%' },
  members: { fr: 'membres', nl: 'leden', en: 'members', de: 'Mitglieder' },
  languages: { fr: 'langues', nl: 'talen', en: 'languages', de: 'Sprachen' },
  inhabitants: { fr: 'habitants', nl: 'inwoners', en: 'inhabitants', de: 'Einwohner' },
  levels: { fr: 'niveaux', nl: 'niveaus', en: 'levels', de: 'Ebenen' },
  eur_month: { fr: '€/mois', nl: '€/maand', en: '€/month', de: '€/Monat' },
  dwellings: { fr: 'logements', nl: 'woningen', en: 'dwellings', de: 'Wohnungen' },
  people: { fr: 'personnes', nl: 'personen', en: 'people', de: 'Personen' },
  eur: { fr: '€', nl: '€', en: '€', de: '€' },
  jobs: { fr: 'emplois', nl: 'banen', en: 'jobs', de: 'Arbeitsplätze' },
  jobseekers: { fr: "chercheurs d'emploi", nl: 'werkzoekenden', en: 'jobseekers', de: 'Arbeitsuchende' },
  enterprises: { fr: 'entreprises', nl: 'ondernemingen', en: 'businesses', de: 'Unternehmen' },
  mtrips: { fr: 'millions de voyages', nl: 'miljoen ritten', en: 'million trips', de: 'Millionen Fahrten' },
  km: { fr: 'km', nl: 'km', en: 'km', de: 'km' },
  stations: { fr: 'stations', nl: 'stations', en: 'stations', de: 'Stationen' },
  lines: { fr: 'lignes', nl: 'lijnen', en: 'lines', de: 'Linien' },
  years: { fr: 'ans', nl: 'jaar', en: 'years', de: 'Jahre' },
  density: { fr: 'hab./km²', nl: 'inw./km²', en: 'inhabitants/km²', de: 'Einw./km²' },
  nationalities: { fr: 'nationalités', nl: 'nationaliteiten', en: 'nationalities', de: 'Nationalitäten' },
  year: { fr: '', nl: '', en: '', de: '' },
  employees: { fr: 'agents', nl: 'personeelsleden', en: 'staff', de: 'Beschäftigte' },
  cameras: { fr: 'caméras', nl: "camera's", en: 'cameras', de: 'Kameras' },
  crimes: { fr: 'faits', nl: 'feiten', en: 'offences', de: 'Straftaten' },
  burglaries: { fr: 'cambriolages', nl: 'inbraken', en: 'burglaries', de: 'Einbrüche' },
};

const TAGS: Record<string, Record<Langue, string>> = {
  inst: { fr: 'Institutionnel', nl: 'Institutioneel', en: 'Institutional', de: 'Institutionell' },
  housing: { fr: 'Logement', nl: 'Huisvesting', en: 'Housing', de: 'Wohnen' },
  finance: { fr: 'Finances', nl: 'Financiën', en: 'Finances', de: 'Finanzen' },
  security: { fr: 'Sécurité', nl: 'Veiligheid', en: 'Security', de: 'Sicherheit' },
  jobs: { fr: 'Emploi', nl: 'Werk', en: 'Employment', de: 'Beschäftigung' },
  society: { fr: 'Société', nl: 'Samenleving', en: 'Society', de: 'Gesellschaft' },
  mobility: { fr: 'Mobilité', nl: 'Mobiliteit', en: 'Mobility', de: 'Mobilität' },
};

const STREAK_KEY = 'amai_streak';
const LAST_KEY = 'amai_last_played';
// La partie terminée du jour. Sans elle, recharger la page relançait une partie
// neuve, et chaque partie rejouée envoyait un résultat de plus à /api/plays, ce qui
// faussait le « Mieux que X % » de tous les lecteurs (relevé par l'équipe rouge le
// 18/09/2026, défaut hérité du widget).
const PARTIE_KEY = 'amai_partie_du_jour';

interface PartieJouee {
  date: string;
  reponses: Reponse[];
  percentile: number | null;
}

function lirePartieJouee(date: string): PartieJouee | null {
  try {
    const p = JSON.parse(localStorage.getItem(PARTIE_KEY) ?? 'null') as PartieJouee | null;
    return p && p.date === date && Array.isArray(p.reponses) && p.reponses.length === 5 ? p : null;
  } catch {
    return null;
  }
}

function enregistrerPartieJouee(p: PartieJouee): void {
  try {
    localStorage.setItem(PARTIE_KEY, JSON.stringify(p));
  } catch {
    // navigation privée : la partie reste jouable, elle ne sera simplement pas retenue
  }
}

// Couleurs du jeu. `sourdine` remplace #6A76A8 pour le TEXTE sur fond blanc.
const NUIT = '#14204F';
const JAUNE = '#F5C518';
const BLEU = '#2B3F8C';
const SOURDINE = '#5A6696';

function lireSerie(aujourdhui: string): number {
  try {
    const last = localStorage.getItem(LAST_KEY);
    const serie = Number(localStorage.getItem(STREAK_KEY) ?? 0);
    if (!last) return 0;
    const ecart = (new Date(aujourdhui).getTime() - new Date(last).getTime()) / 86400000;
    return ecart <= 1 ? serie : 0; // série cassée si un jour a été sauté
  } catch {
    return 0;
  }
}

function enregistrerSerie(aujourdhui: string): number {
  try {
    if (localStorage.getItem(LAST_KEY) === aujourdhui) return Number(localStorage.getItem(STREAK_KEY) ?? 1);
    const n = lireSerie(aujourdhui) + 1;
    localStorage.setItem(STREAK_KEY, String(n));
    localStorage.setItem(LAST_KEY, aujourdhui);
    return n;
  } catch {
    return 1;
  }
}

/** Les liens vers governance.brussels restent sur place et suivent la langue du lecteur. */
function lienSource(url: string, lang: Langue): { href: string; externe: boolean } {
  const m = url.match(/^https?:\/\/governance\.brussels\/(fr|nl|en|de)(\/.*)?$/);
  if (m) return { href: `/${lang}${m[2] ?? ''}`, externe: false };
  return { href: url, externe: true };
}

function estPartie(v: unknown): v is Partie {
  if (!v || typeof v !== 'object') return false;
  const p = v as Partial<Partie>;
  return (
    typeof p.date === 'string' &&
    Array.isArray(p.questions) &&
    p.questions.length === 5 &&
    p.questions.every(
      (q) => typeof q?.anchor === 'number' && q.anchor !== 0 && typeof q.real === 'number' && typeof q.question === 'string',
    )
  );
}

function mouvementReduit(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Compteur({ cible, locale }: { cible: number; locale: string }) {
  const [val, setVal] = useState(0);
  const [reduit] = useState(mouvementReduit);
  useEffect(() => {
    if (reduit) return;
    let debut: number | null = null;
    let r = 0;
    const pas = (t: number) => {
      if (debut === null) debut = t;
      const p = Math.min((t - debut) / 700, 1);
      setVal(Math.round(cible * (1 - Math.pow(1 - p, 3))));
      if (p < 1) r = requestAnimationFrame(pas);
    };
    r = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(r);
  }, [cible, reduit]);
  return <span>{(reduit ? cible : val).toLocaleString(locale)}</span>;
}

export function AmaiGame({ locale }: { locale: string }) {
  const lang: Langue = locale === 'nl' || locale === 'en' || locale === 'de' ? locale : 'fr';
  const t = UI[lang];
  const loc = LOCALES[lang];
  const fmt = (n: number) => n.toLocaleString(loc);
  const archivo = policeAmai.style.fontFamily;

  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  const [tentative, setTentative] = useState(0);
  const [partie, setPartie] = useState<Partie | null>(null);
  const [tour, setTour] = useState(0);
  const [reponses, setReponses] = useState<Reponse[]>([]);
  const [revele, setRevele] = useState(false);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [serie, setSerie] = useState(0);
  const [copie, setCopie] = useState<'' | 'ok' | 'echec'>('');

  const carteRef = useRef<HTMLElement>(null);
  const revelationRef = useRef<HTMLDivElement>(null);
  const interagi = useRef(false);

  useEffect(() => {
    let abandon = false;
    fetch(`${AMAI_API}/api/daily?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: unknown) => {
        if (abandon) return;
        if (!estPartie(d)) throw new Error('réponse inattendue');
        setPartie(d);
        setSerie(lireSerie(d.date));
        // Déjà jouée aujourd'hui sur cet appareil : on retrouve le score, sans
        // nouvelle partie ni nouvel envoi au backend.
        const jouee = lirePartieJouee(d.date);
        if (jouee) {
          setReponses(jouee.reponses);
          setTour(4);
          setPercentile(jouee.percentile);
        }
        setEtat('pret');
      })
      .catch(() => {
        if (!abandon) setEtat('erreur');
      });
    return () => {
      abandon = true;
    };
  }, [lang, tentative]);

  // La révélation s'ajoute sous la question : on l'amène au lecteur plutôt que
  // de le laisser la chercher. Jamais au chargement, seulement après un geste.
  useEffect(() => {
    if (!interagi.current) return;
    const el = revele ? revelationRef.current : carteRef.current;
    el?.scrollIntoView?.({ block: revele ? 'nearest' : 'start', behavior: 'auto' });
  }, [revele, tour]);

  const cur = partie?.questions[tour];
  const fini = reponses.length === 5 && !revele;
  const score = reponses.filter((a) => a.correct).length;
  const amai = cur ? Math.abs(cur.real - cur.anchor) / Math.abs(cur.anchor) >= 0.3 : false;
  const unite = (u: string) => UNITS[u]?.[lang] ?? u;

  function deviner(sens: 'plus' | 'moins') {
    if (revele || !cur) return;
    interagi.current = true;
    const correct = sens === 'plus' ? cur.real > cur.anchor : cur.real < cur.anchor;
    setReponses((a) => [...a, { questionId: cur.id, correct }]);
    setRevele(true);
  }

  function suivant() {
    interagi.current = true;
    setRevele(false);
    if (tour < 4) {
      setTour((r) => r + 1);
      return;
    }
    if (!partie) return;
    // Une seule partie comptée par jour et par appareil : si elle est déjà retenue,
    // on n'envoie rien de plus au backend (voir PARTIE_KEY).
    if (lirePartieJouee(partie.date)) return;
    enregistrerPartieJouee({ date: partie.date, reponses, percentile: null });
    setSerie(enregistrerSerie(partie.date));
    track('jeux-amai-termine', { score });
    // Le jeu reste jouable même si les statistiques échouent.
    fetch(`${AMAI_API}/api/plays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, answers: reponses }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { percentile?: unknown } | null) => {
        const p = typeof d?.percentile === 'number' ? d.percentile : null;
        setPercentile(p);
        enregistrerPartieJouee({ date: partie.date, reponses, percentile: p });
      })
      .catch(() => setPercentile(null));
  }

  function partager() {
    if (!partie) return;
    const carres = reponses.map((a) => (a.correct ? '🟨' : '🟦')).join('');
    // Vers la page de la langue, marquée utm_source=bgm : la racine d'Amai est un
    // redirecteur qui perd la chaîne de requête et ne charge pas Umami.
    const texte = `Amai ! ${partie.date} — ${score}/5\n${carres}\n${lienJeuDepuisBgm(AMAI_URLS[lang], 'partage')}`;
    const signaler = (v: 'ok' | 'echec') => {
      setCopie(v);
      setTimeout(() => setCopie(''), 2500);
    };
    // Mesuré seulement après une copie réussie : une tentative ratée n'est pas un partage.
    const p = navigator.clipboard?.writeText(texte);
    if (!p) return signaler('echec');
    p.then(() => {
      signaler('ok');
      track('jeux-amai-partage', { score });
    }).catch(() => signaler('echec'));
  }

  const quip = score >= 4 ? t.quipHigh : score >= 2 ? t.quipMid : t.quipLow;

  const titre: CSSProperties = {
    fontFamily: archivo,
    fontWeight: 800,
    fontStretch: '105%',
    fontSize: 20,
    lineHeight: 1.22,
    margin: '0 0 var(--qMb)',
  };
  const carte: CSSProperties = {
    background: '#fff',
    color: NUIT,
    borderRadius: 16,
    padding: 'var(--cardY) var(--cardX)',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 12px 40px rgba(0,0,0,.35)',
  };
  const etiquette: CSSProperties = {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: BLEU,
    background: '#EEF1FB',
    padding: '3px 10px',
    borderRadius: 4,
    marginBottom: 12,
  };
  const gros: CSSProperties = {
    flex: 1,
    border: 'none',
    borderRadius: 10,
    padding: 'var(--btnY) 0',
    fontSize: 18,
    fontWeight: 700,
    fontFamily: archivo,
  };
  const contexte: CSSProperties = { fontSize: 15, lineHeight: 1.5, color: '#3A4568', margin: '10px 0 6px' };

  return (
    <div className={s.racine}>
      <div className="mb-3 flex w-full max-w-[480px] items-center justify-between gap-3">
        <p className="text-xs" style={{ opacity: 0.85 }}>
          {t.subtitle}
        </p>
        <p
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: 'rgba(255,255,255,.1)' }}
        >
          <span aria-hidden="true">🔥 {serie}</span>
          <span className="sr-only">{t.streak(serie)}</span>
        </p>
      </div>

      {etat === 'chargement' && (
        <p className="py-8 text-center text-sm" role="status">
          {t.loading}
        </p>
      )}
      {etat === 'erreur' && (
        <div className="py-8 text-center text-sm" role="alert">
          {t.error}{' '}
          <button
            type="button"
            className={s.bouton}
            style={{ marginLeft: 8, background: JAUNE, color: NUIT, border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 700 }}
            onClick={() => {
              setEtat('chargement');
              setTentative((n) => n + 1);
            }}
          >
            {t.retry}
          </button>
        </div>
      )}

      {etat === 'pret' && partie && (
        <>
          <div className="mb-4 flex gap-2.5" role="img" aria-label={t.progress(Math.min(tour + 1, 5))}>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full transition-all"
                style={{
                  background:
                    i < reponses.length
                      ? reponses[i].correct
                        ? JAUNE
                        : BLEU
                      : i === tour && !fini
                        ? '#fff'
                        : 'rgba(255,255,255,.18)',
                  transform: i === tour && !fini ? 'scale(1.25)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {!fini && cur ? (
            <section style={carte} className={s.fondu} key={tour} ref={carteRef}>
              <div style={etiquette}>{TAGS[cur.tag]?.[lang] ?? cur.tag}</div>
              <h4 style={titre}>{cur.question}</h4>
              <div
                style={{
                  background: '#F7F8FC',
                  border: '1px solid #E3E7F5',
                  borderRadius: 12,
                  padding: 'var(--anchorY) 18px',
                  marginBottom: 'var(--anchorMb)',
                }}
              >
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: SOURDINE, marginBottom: 4 }}>
                  {t.anchorLabel}
                </div>
                <div style={{ fontFamily: archivo, fontWeight: 900, fontSize: 32, fontStretch: '110%' }}>
                  {fmt(cur.anchor)}{' '}
                  <span style={{ fontSize: 15, fontWeight: 600, color: SOURDINE }}>{unite(cur.unit)}</span>
                </div>
              </div>
              {!revele ? (
                <div className="flex gap-3">
                  <button type="button" className={s.bouton} style={{ ...gros, background: BLEU, color: '#fff' }} onClick={() => deviner('moins')}>
                    {t.less}
                  </button>
                  <button type="button" className={s.bouton} style={{ ...gros, background: JAUNE, color: NUIT }} onClick={() => deviner('plus')}>
                    {t.more}
                  </button>
                </div>
              ) : (
                <div className={s.fondu} aria-live="polite" ref={revelationRef}>
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div style={{ fontFamily: archivo, fontWeight: 900, fontSize: 36, fontStretch: '112%' }}>
                      <Compteur cible={cur.real} locale={loc} />{' '}
                      <span style={{ fontSize: 16, fontWeight: 600, color: SOURDINE }}>{unite(cur.unit)}</span>
                    </div>
                    {amai && (
                      <span className={s.tampon} style={{ fontFamily: archivo }}>
                        AMAI&nbsp;!
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[15px] font-bold" style={{ color: reponses[tour]?.correct ? '#8A7000' : BLEU }}>
                    {reponses[tour]?.correct ? t.correct : t.wrong}
                  </p>
                  <p style={contexte}>{cur.ctx}</p>
                  {cur.source_url &&
                    (() => {
                      const src = lienSource(cur.source_url, lang);
                      return (
                        <a
                          href={src.href}
                          className={s.lien}
                          style={{ color: SOURDINE, fontSize: 12.5, marginRight: 14 }}
                          {...(src.externe ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          {t.source}
                          {src.externe ? ' ↗' : ''}
                        </a>
                      );
                    })()}
                  <button
                    type="button"
                    className={s.bouton}
                    style={{ ...gros, marginTop: 'var(--nextMt)', width: '100%', background: NUIT, color: '#fff', fontSize: 16, padding: '14px 0' }}
                    onClick={suivant}
                  >
                    {tour < 4 ? t.next : t.seeScore}
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section style={carte} className={s.fondu} ref={carteRef} aria-live="polite">
              <div style={etiquette}>{t.resultTag}</div>
              <h4 style={{ ...titre, marginBottom: 8 }}>
                {score}/5 {quip}
              </h4>
              <p style={{ fontSize: 28, letterSpacing: 4, margin: '6px 0 4px' }} aria-hidden="true">
                {reponses.map((a) => (a.correct ? '🟨' : '🟦')).join('')}
              </p>
              {percentile !== null && (
                <p style={{ fontSize: 14, fontWeight: 700, color: '#8A7000', margin: '4px 0 0' }}>{t.percentile(percentile)}</p>
              )}
              <p style={contexte}>{t.outro}</p>
              <button type="button" className={s.bouton} style={{ ...gros, width: '100%', background: JAUNE, color: NUIT }} onClick={partager}>
                {copie === 'echec' ? t.copyFailed : copie === 'ok' ? t.copied : t.share}
              </button>
              <a
                href={BAROMETRE[lang]}
                className={s.lien}
                style={{ color: BLEU, fontWeight: 600, fontSize: 14, marginTop: 16 }}
                data-umami-event="jeux-amai-barometre"
              >
                {t.explore}
              </a>
              <p
                style={{ marginTop: 'var(--nextMt)', fontSize: 13, color: SOURDINE, borderTop: '1px solid #E3E7F5', paddingTop: 14 }}
              >
                {t.tomorrow}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
