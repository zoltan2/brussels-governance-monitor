// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useCallback, useEffect, useState } from 'react';

type Langue = 'fr' | 'nl' | 'en';
type Textes = Record<Langue, { objet: string; corps: string }>;
interface Etat {
  numero: number;
  textes: Textes | null;
  etat: string;
  essaiLe: number | null;
  essaiAJour: boolean;
  rapport: unknown;
  journal: Record<string, number>;
  exclusConfigures: boolean;
}

const LANGUES: Array<{ id: Langue; nom: string }> = [
  { id: 'fr', nom: 'Français' },
  { id: 'nl', nom: 'Nederlands' },
  { id: 'en', nom: 'English (aussi pour les abonnés en allemand)' },
];
const VIDE: Textes = { fr: { objet: '', corps: '' }, nl: { objet: '', corps: '' }, en: { objet: '', corps: '' } };

export function CoulissesAdmin() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [numero, setNumero] = useState(1);
  const [textes, setTextes] = useState<Textes>(VIDE);
  const [modifie, setModifie] = useState(false);
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const appliquer = useCallback((e: Etat) => {
    setEtat(e);
    setNumero(e.numero);
    setTextes(e.textes ?? VIDE);
    setModifie(false);
  }, []);

  const charger = useCallback(async (n?: number) => {
    const res = await fetch(`/api/admin/coulisses${n ? `?numero=${n}` : ''}`, { cache: 'no-store' });
    if (!res.ok) {
      setMessage(`Lecture impossible (${res.status}).`);
      return;
    }
    appliquer((await res.json()) as Etat);
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
    const { ok, data } = await appel('/api/admin/coulisses', 'PUT', { numero, textes });
    setMessage(ok ? 'Enregistré. Faire un essai avant l’envoi.' : `Refusé : ${String(data.error ?? '')}`);
    if (ok) await charger(numero);
  }

  async function essai() {
    const { ok, data } = await appel('/api/admin/coulisses/essai', 'POST', { numero });
    setMessage(ok ? `${String(data.envoyes)} mails d’essai envoyés à l’adresse d’administration.` : `Essai refusé : ${String(data.error ?? (data.erreurs as string[] | undefined)?.join(' ; ') ?? '')}`);
    await charger(numero);
  }

  async function envoyer() {
    const { data } = await appel('/api/admin/coulisses/envoi', 'POST', { numero, confirmation });
    setMessage(data.error ? `Envoi refusé : ${String(data.error)}` : 'Envoi terminé : voir le rapport.');
    setConfirmation('');
    await charger(numero);
  }

  const fige = etat ? etat.etat !== 'brouillon' : false;
  const complets = LANGUES.every((l) => textes[l.id].objet.trim() && textes[l.id].corps.trim());

  return (
    <div className="mt-6 space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <label htmlFor="coulisses-numero" className="font-medium text-neutral-700">Numéro</label>
        <input
          id="coulisses-numero"
          type="number"
          min={1}
          value={numero}
          onChange={(e) => void charger(Number(e.target.value))}
          className="w-20 rounded border border-neutral-400 px-2 py-1"
        />
        <span className="text-neutral-600">
          État : <strong>{etat?.etat ?? '…'}</strong>
          {etat?.essaiLe ? ` · essai du ${new Date(etat.essaiLe).toLocaleString('fr-BE')}${etat.essaiAJour ? '' : ' (périmé)'}` : ' · aucun essai'}
        </span>
      </div>

      {etat && !etat.exclusConfigures && (
        <p role="alert" className="rounded border border-status-delayed/30 bg-status-delayed/5 p-3 text-sm text-status-delayed">
          COULISSES_EXCLUS n&apos;est pas définie sur le serveur : l&apos;envoi réel sera refusé.
        </p>
      )}

      {LANGUES.map((l) => (
        <fieldset key={l.id} className="rounded border border-neutral-200 p-4" disabled={fige}>
          <legend className="px-1 text-sm font-medium text-neutral-800">{l.nom}</legend>
          <label className="block text-xs text-neutral-600" htmlFor={`objet-${l.id}`}>Objet</label>
          <input
            id={`objet-${l.id}`}
            value={textes[l.id].objet}
            onChange={(e) => {
              setTextes({ ...textes, [l.id]: { ...textes[l.id], objet: e.target.value } });
              setModifie(true);
            }}
            className="mb-3 w-full rounded border border-neutral-400 px-2 py-1 text-sm"
          />
          <label className="block text-xs text-neutral-600" htmlFor={`corps-${l.id}`}>Texte</label>
          <textarea
            id={`corps-${l.id}`}
            rows={10}
            value={textes[l.id].corps}
            onChange={(e) => {
              setTextes({ ...textes, [l.id]: { ...textes[l.id], corps: e.target.value } });
              setModifie(true);
            }}
            className="w-full rounded border border-neutral-400 px-2 py-1 font-serif text-sm"
          />
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void enregistrer()} disabled={occupe || fige}
          className="rounded bg-brand-900 px-4 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50">
          Enregistrer
        </button>
        <button type="button" onClick={() => void essai()} disabled={occupe || fige || modifie || !complets}
          className="rounded border border-brand-900 px-4 py-2 text-sm font-medium text-brand-900 disabled:opacity-50">
          Envoyer l&apos;essai à mon adresse
        </button>
        {modifie && <span className="text-xs text-neutral-600">Modifications non enregistrées.</span>}
      </div>

      <div className="rounded border border-neutral-300 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Envoi réel</h2>
        <p className="mt-1 text-xs text-neutral-600">
          Possible seulement après un essai sur le texte actuel. Retaper le numéro pour confirmer. Un second clic est refusé.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <label htmlFor="coulisses-confirmation" className="text-xs text-neutral-700">Numéro à confirmer</label>
          <input id="coulisses-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)}
            className="w-20 rounded border border-neutral-400 px-2 py-1 text-sm" />
          <button type="button" onClick={() => void envoyer()}
            disabled={occupe || modifie || !etat?.essaiAJour || etat.etat === 'envoye' || etat.etat === 'envoi' || confirmation.trim() !== String(numero)}
            className="rounded bg-status-delayed px-4 py-2 text-sm font-medium text-neutral-50 disabled:opacity-50">
            Envoyer à tous les abonnés
          </button>
        </div>
      </div>

      {message && <p role="status" aria-live="polite" className="text-sm text-neutral-800">{message}</p>}

      {etat && (Object.keys(etat.journal).length > 0 || Boolean(etat.rapport)) && (
        <div className="rounded border border-neutral-200 p-4 text-xs text-neutral-700">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Journal et rapport</h2>
          <p>Journal : {JSON.stringify(etat.journal)}</p>
          {etat.rapport ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(etat.rapport, null, 2)}</pre> : null}
        </div>
      )}
    </div>
  );
}
