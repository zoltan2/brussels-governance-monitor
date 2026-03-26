// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';

type State = 'idle' | 'loading' | 'success' | 'error';

export function PreorderForm() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedName, setConfirmedName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/livre/precommande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setState('error');
        setErrorMsg(data.error || 'Une erreur est survenue. Veuillez réessayer.');
        return;
      }

      setConfirmedName(firstName.trim());
      setState('success');
    } catch {
      setState('error');
      setErrorMsg('Impossible de contacter le serveur. Vérifiez votre connexion.');
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-lg bg-white/10 p-6 text-center">
        <p className="text-base font-medium text-white">
          Merci {confirmedName}&nbsp;!
        </p>
        <p className="mt-2 text-sm text-white/80">
          Ta précommande est enregistrée. Un email de confirmation arrive dans
          ta boîte.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="preorder-firstname"
          className="mb-1 block text-sm font-medium text-white"
        >
          Prénom
        </label>
        <input
          id="preorder-firstname"
          type="text"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-sm text-[#1A2744] placeholder:text-[#4A5568] focus:border-[#F2A900] focus:ring-1 focus:ring-[#F2A900] focus:outline-none"
          placeholder="Ton prénom"
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label
          htmlFor="preorder-email"
          className="mb-1 block text-sm font-medium text-white"
        >
          Email
        </label>
        <input
          id="preorder-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-sm text-[#1A2744] placeholder:text-[#4A5568] focus:border-[#F2A900] focus:ring-1 focus:ring-[#F2A900] focus:outline-none"
          placeholder="ton@email.be"
          disabled={state === 'loading'}
        />
      </div>

      {state === 'error' && (
        <p className="text-sm text-[#F2A900]" role="alert">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full rounded-md bg-[#F2A900] px-4 py-3 text-sm font-bold text-[#0F2140] transition-colors hover:bg-[#F2A900]/90 disabled:opacity-60"
      >
        {state === 'loading'
          ? 'Envoi en cours…'
          : 'Je précommande La Lasagne'}
      </button>
    </form>
  );
}
