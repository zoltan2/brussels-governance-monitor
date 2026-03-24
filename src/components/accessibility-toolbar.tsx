// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'bgm-a11y';

/** Fallback labels (EN) — used when toolbar is rendered outside NextIntlClientProvider */
const fallbackLabels = {
  label: 'Accessibility tools',
  darkMode: 'Dark mode',
  lightMode: 'Light mode',
  increaseFont: 'Increase text size',
  decreaseFont: 'Decrease text size',
  resetFont: 'Default size',
  highContrast: 'High contrast',
  dyslexicFont: 'Dyslexic font',
  readAloud: 'Read aloud',
  stopReading: 'Stop reading',
  print: 'Print',
  close: 'Close',
  open: 'Accessibility',
  fontScale: 'Text size',
};

type ToolbarLabels = typeof fallbackLabels;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;

interface A11yPrefs {
  dark: boolean;
  fontScale: number;
  highContrast: boolean;
  dyslexicFont: boolean;
}

const defaults: A11yPrefs = {
  dark: false,
  fontScale: 1,
  highContrast: false,
  dyslexicFont: false,
};

function loadPrefs(): A11yPrefs {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function savePrefs(prefs: A11yPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyPrefs(prefs: A11yPrefs) {
  const html = document.documentElement;
  html.classList.toggle('dark', prefs.dark);
  // When user explicitly picks light mode, block the prefers-color-scheme media query
  html.classList.toggle('light-forced', !prefs.dark);
  html.classList.toggle('high-contrast', prefs.highContrast);
  html.classList.toggle('dyslexic-font', prefs.dyslexicFont);
  html.style.setProperty('--font-scale', String(prefs.fontScale));

  // Update theme-color meta for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', prefs.dark ? '#1a1a1a' : '#1e293b');
  }

  // Dynamically load OpenDyslexic font when needed
  if (prefs.dyslexicFont && !document.getElementById('dyslexic-font-link')) {
    const link = document.createElement('link');
    link.id = 'dyslexic-font-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.cdnfonts.com/css/opendyslexic';
    document.head.appendChild(link);
  }
}

function getInitialPrefs(): A11yPrefs {
  const saved = loadPrefs();
  if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) saved.dark = true;
  }
  return saved;
}

/**
 * Inner component — only rendered client-side after mount.
 * Accepts labels and locale as props so it works with or without NextIntlClientProvider.
 */
function AccessibilityToolbarInner({ labels: t, locale }: { labels: ToolbarLabels; locale: string }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(getInitialPrefs);
  const [speaking, setSpeaking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Apply prefs on first render
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    applyPrefs(prefs);
  }, [prefs]);

  // Close on Escape + return focus
  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const update = useCallback((partial: Partial<A11yPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      applyPrefs(next);
      return next;
    });
  }, []);

  const toggleDark = () => update({ dark: !prefs.dark });
  const toggleContrast = () => update({ highContrast: !prefs.highContrast });
  const toggleDyslexic = () => update({ dyslexicFont: !prefs.dyslexicFont });

  const increaseFont = () => {
    const next = Math.min(prefs.fontScale + SCALE_STEP, MAX_SCALE);
    update({ fontScale: Math.round(next * 100) / 100 });
  };

  const decreaseFont = () => {
    const next = Math.max(prefs.fontScale - SCALE_STEP, MIN_SCALE);
    update({ fontScale: Math.round(next * 100) / 100 });
  };

  const resetFont = () => update({ fontScale: 1 });

  const readAloud = () => {
    // Guard for browser support
    if (!('speechSynthesis' in window)) return;

    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const main = document.getElementById('main-content') || document.getElementById('digest-content');
    if (!main) return;

    const text = main.innerText;
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);

    // Map locale to BCP 47 language tag
    const langMap: Record<string, string> = {
      fr: 'fr-BE',
      nl: 'nl-BE',
      en: 'en-GB',
      de: 'de-DE',
    };
    utterance.lang = langMap[locale] || locale;
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handlePrint = () => {
    setOpen(false);
    setTimeout(() => window.print(), 100);
  };

  const scalePercent = Math.round(prefs.fontScale * 100);
  const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-50 print:hidden" data-hide-print>
      {/* Toggle button */}
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-900 text-neutral-50 shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          aria-label={t.open}
          title={t.open}
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="12" cy="4.5" r="2" />
            <path d="M12 7v5m0 0-3 5m3-5 3 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 10h10" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="w-72 rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-xl"
          role="region"
          aria-label={t.label}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">{t.label}</h2>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
              aria-label={t.close}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {/* Dark mode */}
            <ToolbarToggle
              active={prefs.dark}
              onClick={toggleDark}
              label={prefs.dark ? t.lightMode : t.darkMode}
              icon={prefs.dark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
            />

            {/* High contrast */}
            <ToolbarToggle
              active={prefs.highContrast}
              onClick={toggleContrast}
              label={t.highContrast}
              icon={'\u25D0'}
            />

            {/* Dyslexic font */}
            <ToolbarToggle
              active={prefs.dyslexicFont}
              onClick={toggleDyslexic}
              label={t.dyslexicFont}
              icon="Aa"
            />

            {/* Font scaling */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2">
              <p className="mb-1.5 text-xs font-medium text-neutral-700">
                {t.fontScale} — {scalePercent}%
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={decreaseFont}
                  disabled={prefs.fontScale <= MIN_SCALE}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-40"
                  aria-label={t.decreaseFont}
                  title={t.decreaseFont}
                >
                  A&#x2212;
                </button>
                <button
                  type="button"
                  onClick={resetFont}
                  className="flex h-8 flex-1 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-xs text-neutral-600 transition-colors hover:bg-neutral-200"
                  aria-label={t.resetFont}
                >
                  {t.resetFont}
                </button>
                <button
                  type="button"
                  onClick={increaseFont}
                  disabled={prefs.fontScale >= MAX_SCALE}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-40"
                  aria-label={t.increaseFont}
                  title={t.increaseFont}
                >
                  A+
                </button>
              </div>
            </div>

            {/* Read aloud (only if browser supports TTS) */}
            {hasTTS && (
              <button
                type="button"
                onClick={readAloud}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  speaking
                    ? 'border-status-ongoing bg-status-ongoing/10 text-status-ongoing'
                    : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
                aria-label={speaking ? t.stopReading : t.readAloud}
              >
                <span className="text-base" aria-hidden="true">{speaking ? '\u23F9' : '\uD83D\uDD0A'}</span>
                {speaking ? t.stopReading : t.readAloud}
              </button>
            )}

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
              aria-label={t.print}
            >
              <span className="text-base" aria-hidden="true">{'\uD83D\uDDA8'}</span>
              {t.print}
            </button>
          </div>

          {/* Status for screen readers */}
          <div className="sr-only" role="status" aria-live="polite">
            {speaking ? t.readAloud : ''}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Outer wrapper: renders null on server, mounts the inner component on client only.
 * Accepts optional locale prop for use outside NextIntlClientProvider (e.g. digest layout).
 */
export function AccessibilityToolbar({ locale: localeProp }: { locale?: string } = {}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []); // eslint-disable-line react-hooks/set-state-in-effect -- mount guard, intentional single render
  if (!mounted) return null;
  return <AccessibilityToolbarWithLabels locale={localeProp} />;
}

/**
 * Resolves labels: tries next-intl first, falls back to hardcoded EN labels.
 */
function AccessibilityToolbarWithLabels({ locale: localeProp }: { locale?: string }) {
  // Try to use next-intl if available, otherwise use fallback labels
  let labels: ToolbarLabels;
  let locale: string;

  try {
    // Dynamic import would be cleaner but hooks can't be conditional.
    // Instead, we try-catch the hook — if NextIntlClientProvider is missing, it throws.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useTranslations, useLocale } = require('next-intl');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const t = useTranslations('toolbar');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    locale = useLocale();
    labels = {
      label: t('label'),
      darkMode: t('darkMode'),
      lightMode: t('lightMode'),
      increaseFont: t('increaseFont'),
      decreaseFont: t('decreaseFont'),
      resetFont: t('resetFont'),
      highContrast: t('highContrast'),
      dyslexicFont: t('dyslexicFont'),
      readAloud: t('readAloud'),
      stopReading: t('stopReading'),
      print: t('print'),
      close: t('close'),
      open: t('open'),
      fontScale: t('fontScale'),
    };
  } catch {
    labels = fallbackLabels;
    locale = localeProp || 'en';
  }

  if (localeProp) locale = localeProp;

  return <AccessibilityToolbarInner labels={labels} locale={locale} />;
}

function ToolbarToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
        active
          ? 'border-brand-700 bg-brand-900/10 text-brand-900'
          : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
      }`}
      role="switch"
      aria-checked={active}
    >
      <span className="text-base" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
