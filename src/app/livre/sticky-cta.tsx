// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

'use client';

import { useEffect, useState } from 'react';

export function StickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById('preorder-section');
    if (!form) return;

    const target = form;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    function handleScroll() {
      if (window.scrollY > 200) {
        observer.observe(target);
        window.removeEventListener('scroll', handleScroll);
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1B3A6B]/20 bg-[#1B3A6B] px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <p className="text-sm font-medium text-white">
          La Lasagne — Zoltán Jánosi
        </p>
        <a
          href="#preorder-section"
          className="shrink-0 rounded-md bg-[#F2A900] px-5 py-2 text-sm font-bold text-[#0F2140] transition-colors hover:bg-[#F2A900]/90"
        >
          Je précommande
        </a>
      </div>
    </div>
  );
}
