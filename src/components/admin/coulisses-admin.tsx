// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { CoulissesEditeur } from './coulisses-editeur';
import { CoulissesRapport } from './coulisses-rapport';

type Langue = 'fr' | 'nl' | 'en';
interface Texte { objet: string; corps: string; apercu: string; sondage?: string }
type Textes = Record<Langue, Texte>;
interface Etat {
  mois: string;
  jour: string;
  jourDEnvoi: boolean;
  numero: number | null;
  edition: Partial<Textes>;
  bienvenue: { version: number; creeLe: number; textes: Partial<Textes> } | null;
  repereManquant: Langue[];
  sondageEnDur: Langue[];
  orphelins: number[];
  sondageOuvert: boolean | null;
  etat: string;
  verrouLe: number | null;
  bloque: boolean;
  essaiLe: number | null;
  essaiAJour: boolean;
  incomplet: string | null;
  rapport: unknown;
  journal: Record<string, number>;
  exclusConfigures: boolean;
}

const LANGUES: Array<{ id: Langue; nom: string }> = [
  { id: 'fr', nom: 'Français' },
  { id: 'nl', nom: 'Nederlands' },
  { id: 'en', nom: 'English (aussi pour les abonnés en allemand)' },
];
const VIDE: Texte = { objet: '', corps: '', apercu: '', sondage: '' };
const vides = (): Textes => ({ fr: { ...VIDE }, nl: { ...VIDE }, en: { ...VIDE } });
const remplir = (t: Partial<Textes> | undefined): Textes => {
  const v = vides();
  for (const l of ['fr', 'nl', 'en'] as const) v[l] = { ...VIDE, ...(t?.[l] ?? {}) };
  return v;
};

/** Texte visible d'un corps HTML, pour les contrôles de la page. */
function texteVisible(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
const aUnTiret = (t: Texte) => /[—–]/.test(texteVisible(t.corps + ' ' + (t.sondage ?? '')) + t.objet + t.apercu);

function jourEnClair(jour: string): string {
  return new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${jour}T12:00:00Z`));
}

function Champs({ prefixe, texte, fige, avecSondage, cle, onChange }: {
  prefixe: string; texte: Texte; fige: boolean; avecSondage: boolean; cle: string; onChange: (t: Partial<Texte>) => void;
}) {
  return (
    <>
      <label className="block text-xs text-neutral-600" htmlFor={`${prefixe}-objet`}>Objet</label>
      <input id={`${prefixe}-objet`} value={texte.objet} disabled={fige} onChange={(e) => onChange({ objet: e.target.value })}
        className="mb-3 w-full rounded border border-neutral-400 px-2 py-1 text-sm" />
      <label className="block text-xs text-neutral-600" htmlFor={`${prefixe}-apercu`}>
        Aperçu dans la boîte de réception (facultatif, sinon le début du texte)
      </label>
      <input id={`${prefixe}-apercu`} value={texte.apercu} maxLength={200} disabled={fige} onChange={(e) => onChange({ apercu: e.target.value })}
        className="mb-3 w-full rounded border border-neutral-400 px-2 py-1 text-sm" />
      <label className="block text-xs text-neutral-600" htmlFor={`${prefixe}-corps`}>Texte</label>
      <CoulissesEditeur key={`${cle}-corps`} id={`${prefixe}-corps`} initial={texte.corps} disabled={fige} onChange={(corps) => onChange({ corps })} />
      {avecSondage && (
        <>
          <label className="mt-3 block text-xs text-neutral-600" htmlFor={`${prefixe}-sondage`}>
            Bloc sondage : inséré à la place du paragraphe « [sondage] » tant que le sondage est ouvert, retiré ensuite.
            Laisser vide si le sondage n&apos;existe pas dans cette langue.
          </label>
          <CoulissesEditeur key={`${cle}-sondage`} id={`${prefixe}-sondage`} initial={texte.sondage ?? ''} disabled={fige} onChange={(sondage) => onChange({ sondage })} />
        </>
      )}
      {aUnTiret(texte) && (
        <p className="mt-2 text-xs text-status-delayed">Tiret cadratin ou demi-cadratin présent : à remplacer par une virgule ou un deux-points.</p>
      )}
    </>
  );
}

export function CoulissesAdmin() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [bienvenue, setBienvenue] = useState<Textes>(vides);
  const [edition, setEdition] = useState<Textes>(vides);
  const [modifie, setModifie] = useState(false);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);
  // Recrée les éditeurs à chaque chargement depuis le serveur.
  const [chargement, setChargement] = useState(0);

  const appliquer = useCallback((e: Etat) => {
    setEtat(e);
    setBienvenue(remplir(e.bienvenue?.textes));
    setEdition(remplir(e.edition));
    setModifie(false);
    setSimulation(null);
    setChargement((c) => c + 1);
  }, []);

  const charger = useCallback(async (mois?: string) => {
    try {
      const res = await fetch(`/api/admin/coulisses${mois ? `?mois=${encodeURIComponent(mois)}` : ''}`, { cache: 'no-store' });
      if (!res.ok) {
        setMessage(`Lecture impossible (${res.status}).`);
        return;
      }
      appliquer((await res.json()) as Etat);
    } catch {
      setMessage('Lecture impossible.');
    }
  }, [appliquer]);

  useEffect(() => {
    fetch('/api/admin/coulisses', { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<Etat>) : null))
      .then((e) => {
        if (e) appliquer(e);
        else setMessage('Lecture impossible.');
      })
      .catch(() => setMessage('Lecture impossible.'));
  }, [appliquer]);

  async function appel(url: string, method: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    setOccupe(true);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: res.ok, data };
    } finally {
      setOccupe(false);
    }
  }

  async function enregistrer() {
    if (!etat) return;
    const { ok, data } = await appel('/api/admin/coulisses', 'PUT', {
      mois: etat.mois,
      bienvenue,
      edition,
      versionBienvenueBase: etat.bienvenue?.version ?? null,
    });
    setMessage(ok ? `Enregistré (bienvenue v${String(data.versionBienvenue)}). Faire un essai avant l’envoi.` : `Refusé : ${String(data.error ?? '')}`);
    if (ok) await charger(etat.mois);
  }

  async function simuler() {
    if (!etat?.numero) return;
    const numero = etat.numero;
    const { ok, data } = await appel('/api/admin/coulisses/simulation', 'POST', { numero });
    if (!ok) {
      setMessage(`Simulation refusée : ${String(data.error ?? '')}`);
      return;
    }
    setSimulation(null);
    setMessage('Simulation en cours (lecture de la liste Resend, environ une minute)…');
    // Lecture en arrière-plan sur le serveur : relire toutes les 3 s, deux minutes et demie au plus.
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/admin/coulisses/simulation?numero=${numero}`, { cache: 'no-store' }).catch(() => null);
      const e = res?.ok ? ((await res.json()) as { finLe?: number; resultat?: Record<string, unknown>; erreur?: string } | null) : null;
      if (e?.finLe) {
        if (e.resultat) setSimulation(e.resultat);
        setMessage(e.erreur ? `Simulation impossible : ${e.erreur}` : 'Simulation faite : rien n’a été envoyé ni écrit.');
        return;
      }
    }
    setMessage('Simulation trop longue : relancer plus tard.');
  }

  async function essai() {
    if (!etat?.numero) return;
    const { ok, data } = await appel('/api/admin/coulisses/essai', 'POST', { numero: etat.numero });
    setMessage(ok ? `${String(data.envoyes)} mails d’essai envoyés à l’adresse d’administration.` : `Essai refusé : ${String(data.error ?? (data.erreurs as string[] | undefined)?.join(' ; ') ?? '')}`);
    await charger(etat.mois);
  }

  async function envoyer() {
    if (!etat?.numero) return;
    const { ok, data } = await appel('/api/admin/coulisses/envoi', 'POST', { numero: etat.numero, confirmation });
    setMessage(ok ? 'Envoi lancé. Cette page suit son avancement.' : `Envoi refusé : ${String(data.error ?? 'réponse inattendue')}`);
    setConfirmation('');
    await charger(etat.mois);
  }

  async function debloquer() {
    if (!etat?.numero) return;
    const { ok, data } = await appel('/api/admin/coulisses/debloquer', 'POST', { numero: etat.numero });
    setMessage(ok ? 'Débloqué : envoi « interrompu ». Vérifier les incertains dans Resend avant de reprendre.' : `Refusé : ${String(data.error ?? '')}`);
    await charger(etat.mois);
  }

  // Pendant l'envoi (en arrière-plan sur le serveur), relire l'état toutes les 3 s.
  useEffect(() => {
    if (etat?.etat !== 'envoi') return;
    const id = setInterval(() => {
      fetch(`/api/admin/coulisses?mois=${encodeURIComponent(etat.mois)}`, { cache: 'no-store' })
        .then((res) => (res.ok ? (res.json() as Promise<Etat>) : null))
        .then((e) => {
          if (e && (e.etat !== 'envoi' || e.bloque)) {
            appliquer(e);
            if (e.etat !== 'envoi') {
              setMessage(e.etat === 'envoye' ? 'Envoi terminé sans erreur. Rapport ci-dessous.' : 'Envoi interrompu : voir les erreurs du rapport.');
            }
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [etat?.etat, etat?.mois, appliquer]);

  const fige = etat ? etat.etat !== 'brouillon' && etat.etat !== 'interrompu' : true;
  const maj = (setter: typeof setBienvenue, l: Langue) => (t: Partial<Texte>) => {
    setter((x) => ({ ...x, [l]: { ...x[l], ...t } }));
    setModifie(true);
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor="coulisses-mois" className="font-medium text-neutral-700">Rendez-vous</label>
        <input id="coulisses-mois" type="month" value={etat?.mois ?? ''} onChange={(e) => e.target.value && void charger(e.target.value)}
          className="rounded border border-neutral-400 px-2 py-1" />
        {etat && (
          <span className="text-neutral-600">
            {jourEnClair(etat.jour)} · état : <strong>{etat.etat}</strong>
            {etat.essaiLe ? ` · essai du ${new Date(etat.essaiLe).toLocaleString('fr-BE')}${etat.essaiAJour ? '' : ' (périmé)'}` : ' · aucun essai'}
            {etat.sondageOuvert !== null && ` · sondage ${etat.sondageOuvert ? 'ouvert' : 'clos'}`}
          </span>
        )}
      </div>

      {etat && !etat.exclusConfigures && (
        <p role="alert" className="rounded border border-status-delayed/30 bg-status-delayed/5 p-3 text-sm text-status-delayed">
          COULISSES_EXCLUS n&apos;est pas définie sur le serveur : l&apos;envoi réel sera refusé.
        </p>
      )}
      {etat && etat.repereManquant.length > 0 && (
        <p role="alert" className="rounded border border-status-delayed/30 bg-status-delayed/5 p-3 text-sm text-status-delayed">
          Bloc sondage sans paragraphe « [sondage] » dans la bienvenue ({etat.repereManquant.join(', ')}) : le bloc ne partira pas.
        </p>
      )}

      {etat && etat.sondageEnDur.length > 0 && (
        <p role="alert" className="rounded border border-status-delayed/30 bg-status-delayed/5 p-3 text-sm text-status-delayed">
          Lien vers le sondage écrit dans le texte de la bienvenue ({etat.sondageEnDur.join(', ')}) : il resterait après la
          clôture. Le déplacer dans le bloc sondage, et laisser un paragraphe « [sondage] » à sa place.
        </p>
      )}
      {etat && etat.orphelins.length > 0 && (
        <p role="alert" className="rounded border border-status-delayed/30 bg-status-delayed/5 p-3 text-sm text-status-delayed">
          Rendez-vous sans mois (numéros {etat.orphelins.join(', ')}), écrits avant la séparation : leur texte n&apos;est pas
          affiché ici. À vérifier avant d&apos;écrire un nouveau rendez-vous.
        </p>
      )}

      <section aria-labelledby="titre-bienvenue" className="space-y-3">
        <h2 id="titre-bienvenue" className="text-base font-semibold text-neutral-900">
          Bienvenue {etat?.bienvenue ? `(version ${etat.bienvenue.version})` : '(aucune version)'}
        </h2>
        <p className="text-xs text-neutral-600">
          Le même texte pour chaque nouvel abonné, une seule fois, au premier rendez-vous où il a 21 jours d&apos;ancienneté.
          Jamais numéroté. Le modifier crée une nouvelle version, pour les prochains rendez-vous seulement.
        </p>
        {LANGUES.map((l) => (
          <fieldset key={`b-${l.id}`} className="rounded border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-medium text-neutral-800">{l.nom}</legend>
            <Champs prefixe={`bienvenue-${l.id}`} texte={bienvenue[l.id]} fige={fige} avecSondage cle={`b-${l.id}-${chargement}`} onChange={maj(setBienvenue, l.id)} />
          </fieldset>
        ))}
      </section>

      <section aria-labelledby="titre-edition" className="space-y-3">
        <h2 id="titre-edition" className="text-base font-semibold text-neutral-900">
          Édition {etat ? `du ${jourEnClair(etat.jour)}` : ''}
        </h2>
        <p className="text-xs text-neutral-600">
          Pour les abonnés qui ont déjà reçu la bienvenue. Les trois langues, ou rien : sans édition, seules les bienvenues partent.
        </p>
        {LANGUES.map((l) => (
          <fieldset key={`e-${l.id}`} className="rounded border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-medium text-neutral-800">{l.nom}</legend>
            <Champs prefixe={`edition-${l.id}`} texte={edition[l.id]} fige={fige} avecSondage={false} cle={`e-${l.id}-${chargement}`} onChange={maj(setEdition, l.id)} />
          </fieldset>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void enregistrer()} disabled={occupe || fige}
          className="rounded bg-brand-900 px-4 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50">
          Enregistrer
        </button>
        <button type="button" onClick={() => void simuler()} disabled={occupe || modifie || !etat?.numero}
          className="rounded border border-brand-900 px-4 py-2 text-sm font-medium text-brand-900 disabled:opacity-50">
          Simuler les destinataires
        </button>
        <button type="button" onClick={() => void essai()} disabled={occupe || fige || modifie || !etat?.numero || Boolean(etat?.incomplet)}
          className="rounded border border-brand-900 px-4 py-2 text-sm font-medium text-brand-900 disabled:opacity-50">
          Envoyer l&apos;essai à mon adresse
        </button>
        {modifie && <span className="text-xs text-neutral-600">Modifications non enregistrées.</span>}
        {etat?.incomplet && !modifie && <span className="text-xs text-status-delayed">{etat.incomplet}</span>}
      </div>

      {simulation && (
        <div className="rounded border border-neutral-200 p-4 text-xs text-neutral-700">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Simulation (rien n&apos;est parti)</h2>
          <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(simulation, null, 2)}</pre>
        </div>
      )}

      <div className="rounded border border-neutral-300 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Envoi réel</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Seulement le {etat ? jourEnClair(etat.jour) : 'premier jeudi du mois'}, heure de Bruxelles, après un essai sur le contenu actuel.
          Un rendez-vous manqué n&apos;est pas rattrapé. Retaper le mois ({etat?.mois}) pour confirmer.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="coulisses-confirmation" className="text-xs text-neutral-700">Mois à confirmer</label>
          <input id="coulisses-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="AAAA-MM"
            className="w-28 rounded border border-neutral-400 px-2 py-1 text-sm" />
          <button type="button" onClick={() => void envoyer()}
            disabled={occupe || modifie || !etat?.essaiAJour || !etat.jourDEnvoi || fige || confirmation.trim() !== etat.mois}
            className="rounded bg-status-delayed px-4 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50">
            Envoyer à tous les abonnés
          </button>
          {etat && !etat.jourDEnvoi && <span className="text-xs text-neutral-600">Pas aujourd&apos;hui.</span>}
        </div>
      </div>

      {etat?.etat === 'envoi' && (
        <div className="flex items-center gap-3 text-sm text-neutral-800">
          <span>Envoi en cours sur le serveur…</span>
          {etat.bloque && (
            <button type="button" onClick={() => void debloquer()} disabled={occupe} className="rounded border border-neutral-500 px-3 py-1 text-xs">
              Débloquer (envoi coupé)
            </button>
          )}
        </div>
      )}

      {message && <p role="status" aria-live="polite" className="text-sm text-neutral-800">{message}</p>}

      {etat && (Object.keys(etat.journal).length > 0 || Boolean(etat.rapport)) && (
        <CoulissesRapport rapport={etat.rapport} journal={etat.journal} />
      )}
    </div>
  );
}
