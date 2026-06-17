// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import ReactMarkdown from 'react-markdown';
import { mdToText } from '@/lib/md-to-text';

export interface FaqSource {
  label: string;
  url: string;
  accessedAt: string;
}

export interface FaqEntry {
  q: string;
  a: string;
  sources: FaqSource[];
}

/**
 * Bloc « Questions fréquentes » d'un dossier/domaine. Présentationnel pur :
 * le `title` (i18n) est résolu par la page appelante. Rend la section visible
 * (`<details open>` = prominent + crawlable) ET le JSON-LD FAQPage.
 * Accessibilité : `<details>/<summary>` portent nativement la sémantique
 * disclosure — AUCUN `role` ni `aria-expanded` ajouté à la main.
 */
export function DossierFaq({ faq, title }: { faq: FaqEntry[]; title: string }) {
  if (!faq?.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((e) => ({
      '@type': 'Question',
      name: e.q,
      acceptedAnswer: { '@type': 'Answer', text: mdToText(e.a) },
    })),
  };

  return (
    <section aria-labelledby="dossier-faq-heading" className="mt-12 border-t border-slate-200 pt-8">
      <h2 id="dossier-faq-heading" className="text-2xl font-bold text-slate-900">
        {title}
      </h2>
      <div className="mt-6 space-y-3">
        {faq.map((e, i) => (
          <details key={i} open id={`faq-${i}`} className="rounded-lg bg-slate-50 p-4">
            <summary className="cursor-pointer text-lg font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
              {e.q}
            </summary>
            <div className="mt-3 leading-relaxed text-slate-700">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-800 underline hover:text-blue-900">
                      {children}
                    </a>
                  ),
                }}
              >
                {e.a}
              </ReactMarkdown>
            </div>
            {e.sources.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                {e.sources.map((s, j) => (
                  <li key={j}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </section>
  );
}
