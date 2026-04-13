// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState } from 'react';

type State = 'idle' | 'loading' | 'success' | 'error';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          organization: organization.trim(),
          message: message.trim(),
          source: 'cafe-numerique',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setState('error');
        setErrorMsg(data.error || 'Une erreur est survenue. Veuillez réessayer.');
        return;
      }

      setState('success');
    } catch {
      setState('error');
      setErrorMsg('Impossible de contacter le serveur. Vérifiez votre connexion.');
    }
  }

  if (state === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-[#F2A900]/40 bg-white/10 p-6 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F2A900]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0F2140"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="mt-4 text-xl font-bold text-white">
          Message envoyé&nbsp;!
        </p>
        <p className="mt-2 text-sm text-white/90">
          Votre message est bien parti vers{' '}
          <span className="font-medium text-white">
            contact@brusselsgovernance.be
          </span>
          .
        </p>
        <p className="mt-1 text-sm text-white/80">
          Je vous réponds personnellement dans les prochains jours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1 block text-sm font-medium text-white"
        >
          Nom
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white px-3 py-3 text-base text-[#1A2744] placeholder:text-[#4A5568] focus:border-[#F2A900] focus:ring-1 focus:ring-[#F2A900] focus:outline-none"
          placeholder="Votre nom"
          autoComplete="name"
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="mb-1 block text-sm font-medium text-white"
        >
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white px-3 py-3 text-base text-[#1A2744] placeholder:text-[#4A5568] focus:border-[#F2A900] focus:ring-1 focus:ring-[#F2A900] focus:outline-none"
          placeholder="vous@exemple.be"
          autoComplete="email"
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label
          htmlFor="contact-organization"
          className="mb-1 block text-sm font-medium text-white"
        >
          Organisation
        </label>
        <input
          id="contact-organization"
          type="text"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white px-3 py-3 text-base text-[#1A2744] placeholder:text-[#4A5568] focus:border-[#F2A900] focus:ring-1 focus:ring-[#F2A900] focus:outline-none"
          placeholder="Cabinet, institution, entreprise…"
          autoComplete="organization"
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-medium text-white"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-white/20 bg-white px-3 py-3 text-base text-[#1A2744] placeholder:text-[#4A5568] focus:border-[#F2A900] focus:ring-1 focus:ring-[#F2A900] focus:outline-none"
          placeholder="Ce qui vous amène…"
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
        className="min-h-[48px] w-full rounded-md bg-[#F2A900] px-4 py-3 text-base font-bold text-[#0F2140] transition-colors hover:bg-[#F2A900]/90 disabled:opacity-60"
      >
        {state === 'loading' ? 'Envoi en cours…' : 'Envoyer'}
      </button>
    </form>
  );
}
