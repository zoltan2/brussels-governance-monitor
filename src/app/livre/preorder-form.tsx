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
        setErrorMsg(data.error || 'Une erreur est survenue. Veuillez r\u00e9essayer.');
        return;
      }

      setConfirmedName(firstName.trim());
      setState('success');
    } catch {
      setState('error');
      setErrorMsg('Impossible de contacter le serveur. V\u00e9rifiez votre connexion.');
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-lg bg-[#1B3A6B]/5 p-6 text-center">
        <p className="text-base font-medium text-[#1B3A6B]">
          Merci {confirmedName}&nbsp;!
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Ta pr&eacute;commande est enregistr&eacute;e. Un email de
          confirmation arrive dans ta bo&icirc;te.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="preorder-firstname"
          className="mb-1 block text-sm font-medium text-neutral-700"
        >
          Pr&eacute;nom
        </label>
        <input
          id="preorder-firstname"
          type="text"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] focus:outline-none"
          placeholder="Ton pr\u00e9nom"
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label
          htmlFor="preorder-email"
          className="mb-1 block text-sm font-medium text-neutral-700"
        >
          Email
        </label>
        <input
          id="preorder-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#1B3A6B] focus:ring-1 focus:ring-[#1B3A6B] focus:outline-none"
          placeholder="ton@email.be"
          disabled={state === 'loading'}
        />
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600" role="alert">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full rounded-md bg-[#1B3A6B] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1B3A6B]/90 disabled:opacity-60"
      >
        {state === 'loading'
          ? 'Envoi en cours\u2026'
          : 'Je pr\u00e9commande La Lasagne'}
      </button>
    </form>
  );
}
