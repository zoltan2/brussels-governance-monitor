'use client';

import { useEffect, useState } from 'react';

interface LocaleStrings {
  fr: string;
  nl: string;
  en: string;
  de: string;
}

interface PendingDigest {
  week: string;
  created_at: string;
  approved: boolean;
  sent: boolean;
  sent_at?: string;
  summary: LocaleStrings;
  weeklyNumber: {
    value: string;
    label: LocaleStrings;
    source: LocaleStrings;
  };
  closingNote: LocaleStrings;
  commitmentCount: number;
  updatedDomains: string[];
}

type Status = 'loading' | 'loaded' | 'saving' | 'error' | 'approving';

export default function DigestReviewPage() {
  const [digest, setDigest] = useState<PendingDigest | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable fields
  const [numberValue, setNumberValue] = useState('');
  const [numberLabelFr, setNumberLabelFr] = useState('');
  const [numberSourceFr, setNumberSourceFr] = useState('');
  const [closingNoteFr, setClosingNoteFr] = useState('');
  const [closingNoteNl, setClosingNoteNl] = useState('');
  const [closingNoteEn, setClosingNoteEn] = useState('');
  const [closingNoteDe, setClosingNoteDe] = useState('');

  useEffect(() => {
    fetchDigest();
  }, []);

  async function fetchDigest() {
    setStatus('loading');
    try {
      const res = await fetch('/api/digest/pending');
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to load digest');
        setStatus('error');
        return;
      }
      const data: PendingDigest = await res.json();
      setDigest(data);
      setNumberValue(data.weeklyNumber.value);
      setNumberLabelFr(data.weeklyNumber.label.fr);
      setNumberSourceFr(data.weeklyNumber.source.fr);
      setClosingNoteFr(data.closingNote.fr);
      setClosingNoteNl(data.closingNote.nl);
      setClosingNoteEn(data.closingNote.en);
      setClosingNoteDe(data.closingNote.de);
      setStatus('loaded');
    } catch {
      setError('Failed to fetch pending digest');
      setStatus('error');
    }
  }

  async function handleSave() {
    if (!digest) return;
    setStatus('saving');
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/digest/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyNumber: {
            value: numberValue,
            label: { fr: numberLabelFr, nl: numberLabelFr, en: numberLabelFr, de: numberLabelFr },
            source: { fr: numberSourceFr, nl: numberSourceFr, en: numberSourceFr, de: numberSourceFr },
          },
          closingNote: { fr: closingNoteFr, nl: closingNoteNl, en: closingNoteEn, de: closingNoteDe },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        setStatus('loaded');
        return;
      }

      setSuccessMsg('Sauvegardé');
      setStatus('loaded');
      // Refresh to get updated data
      await fetchDigest();
    } catch {
      setError('Failed to save');
      setStatus('loaded');
    }
  }

  async function handleTestSend() {
    if (!digest) return;
    setStatus('saving');
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/digest/test-send', { method: 'POST' });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send test');
        setStatus('loaded');
        return;
      }

      const data = await res.json();
      setSuccessMsg(`Mail test envoyé à ${data.sentTo}`);
      setStatus('loaded');
    } catch {
      setError('Failed to send test');
      setStatus('loaded');
    }
  }

  async function handleApprove() {
    if (!digest || digest.sent) return;
    if (!confirm('Confirmer l\'envoi du digest ? Les mails seront envoyés lundi 8h CET.')) return;

    setStatus('approving');
    setError('');
    setSuccessMsg('');

    try {
      // Generate token server-side
      const res = await fetch('/api/digest/approve-from-review', { method: 'POST' });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to approve');
        setStatus('loaded');
        return;
      }

      const data = await res.json();
      setSuccessMsg(`Digest approuvé ! ${data.sent} mail(s) programmé(s) (${data.scheduledAt})`);
      setStatus('loaded');
      await fetchDigest();
    } catch {
      setError('Failed to approve');
      setStatus('loaded');
    }
  }

  if (status === 'loading') {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-2xl px-4">
          <p className="text-neutral-500">Chargement du digest en attente...</p>
        </div>
      </div>
    );
  }

  if (status === 'error' && !digest) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
            <p className="text-amber-800">{error || 'Aucun digest en attente.'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!digest) return null;

  const isSent = digest.sent;
  const isApproved = digest.approved;

  return (
    <div className="py-12">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="mb-2 text-2xl font-bold text-neutral-900">
          Digest — {digest.week}
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Créé le {new Date(digest.created_at).toLocaleDateString('fr-BE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {/* Status badges */}
        <div className="mb-6 flex gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isSent
                ? 'bg-teal-100 text-teal-800'
                : isApproved
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isSent ? 'Envoyé' : isApproved ? 'Approuvé' : 'En attente'}
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            {digest.updatedDomains.length} domaine{digest.updatedDomains.length > 1 ? 's' : ''}
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            {digest.commitmentCount} engagements
          </span>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">
            {successMsg}
          </div>
        )}

        {/* Summary (read-only) */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">Résumé (auto-généré)</h2>
          <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
            {digest.summary.fr}
          </p>
        </section>

        {/* Updated domains (read-only) */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">Domaines mis à jour</h2>
          <div className="flex flex-wrap gap-2">
            {digest.updatedDomains.map((d) => (
              <span
                key={d}
                className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
              >
                {d}
              </span>
            ))}
            {digest.updatedDomains.length === 0 && (
              <span className="text-sm text-neutral-400 italic">Aucun</span>
            )}
          </div>
        </section>

        {/* Editable: weekly number */}
        <section className="mb-6 rounded-lg border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Chiffre de la semaine
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Valeur</label>
              <input
                type="text"
                value={numberValue}
                onChange={(e) => setNumberValue(e.target.value)}
                disabled={isSent}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Légende (FR)</label>
              <input
                type="text"
                value={numberLabelFr}
                onChange={(e) => setNumberLabelFr(e.target.value)}
                disabled={isSent}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Source (FR)</label>
              <input
                type="text"
                value={numberSourceFr}
                onChange={(e) => setNumberSourceFr(e.target.value)}
                disabled={isSent}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
            </div>
          </div>
        </section>

        {/* Editable: closing note — 4 locales */}
        <section className="mb-6 rounded-lg border border-neutral-200 p-4">
          <h2 className="mb-1 text-sm font-semibold text-neutral-700">
            Mot de la fin
          </h2>
          <p className="mb-3 text-xs text-neutral-400">
            Retours à la ligne supportés. <code className="rounded bg-neutral-100 px-1">*italique*</code> <code className="rounded bg-neutral-100 px-1">**gras**</code>
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">FR</label>
              <textarea
                value={closingNoteFr}
                onChange={(e) => setClosingNoteFr(e.target.value)}
                disabled={isSent}
                rows={4}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">NL</label>
              <textarea
                value={closingNoteNl}
                onChange={(e) => setClosingNoteNl(e.target.value)}
                disabled={isSent}
                rows={4}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">EN</label>
              <textarea
                value={closingNoteEn}
                onChange={(e) => setClosingNoteEn(e.target.value)}
                disabled={isSent}
                rows={4}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">DE</label>
              <textarea
                value={closingNoteDe}
                onChange={(e) => setClosingNoteDe(e.target.value)}
                disabled={isSent}
                rows={4}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
              />
            </div>
          </div>
        </section>

        {/* Action buttons */}
        {!isSent && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSave}
              disabled={status === 'saving' || status === 'approving'}
              className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
            >
              {status === 'saving' ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={handleTestSend}
              disabled={status === 'saving' || status === 'approving'}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
            >
              Envoyer un test
            </button>
            <button
              onClick={handleApprove}
              disabled={status === 'saving' || status === 'approving'}
              className="rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              {status === 'approving' ? 'Approbation...' : 'Approuver l\'envoi'}
            </button>
          </div>
        )}

        {isSent && digest.sent_at && (
          <div className="rounded-md border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm text-teal-800">
              Digest envoyé le {new Date(digest.sent_at).toLocaleDateString('fr-BE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
