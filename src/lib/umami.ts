// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Client Umami pour la tuile Trafic de /admin.
 *
 * Umami self-hosted n'expose PAS de clé API : l'en-tête x-umami-api-key est
 * propre à Umami Cloud. On se connecte donc par POST /api/auth/login et on
 * réutilise le jeton porteur, mis en cache dans le processus.
 *
 * Secrets lus côté serveur uniquement, jamais NEXT_PUBLIC_*.
 */

const DEFAULT_URL = 'https://analytics.governance.brussels';
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 h : le conteneur est de longue durée
const FETCH_TIMEOUT_MS = 5000; // le hub ne doit pas rester bloqué sur Umami

export interface UmamiSummary {
  visitors: number;
  pageviews: number;
  topPages: { path: string; views: number }[];
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  // Les versions récentes enveloppent chaque métrique dans { value, prev }.
  if (value !== null && typeof value === 'object') {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === 'number' && Number.isFinite(inner)) return inner;
  }
  return null;
}

export function parseStats(
  raw: unknown,
): { visitors: number; pageviews: number } | null {
  if (raw === null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const visitors = numberFrom(record.visitors);
  const pageviews = numberFrom(record.pageviews);
  if (visitors === null || pageviews === null) return null;
  return { visitors, pageviews };
}

export function parseTopPages(
  raw: unknown,
  limit: number,
): { path: string; views: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { path: string; views: number }[] = [];
  for (const row of raw) {
    if (row === null || typeof row !== 'object') continue;
    const { x, y } = row as { x?: unknown; y?: unknown };
    if (typeof x !== 'string' || typeof y !== 'number' || !Number.isFinite(y)) {
      continue;
    }
    out.push({ path: x, views: y });
    if (out.length >= limit) break;
  }
  return out;
}

async function getToken(baseUrl: string): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const username = process.env.UMAMI_USERNAME;
  const password = process.env.UMAMI_PASSWORD;
  if (!username || !password) return null;

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { token?: unknown };
  if (typeof body.token !== 'string') return null;

  cachedToken = { value: body.token, expiresAt: now + TOKEN_TTL_MS };
  return body.token;
}

export async function getUmamiSummary(
  days = 7,
): Promise<UmamiSummary | null> {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (!websiteId) return null;

  const baseUrl = process.env.UMAMI_URL || DEFAULT_URL;

  try {
    const token = await getToken(baseUrl);
    if (!token) return null;

    const endAt = Date.now();
    const startAt = endAt - days * 24 * 60 * 60 * 1000;
    const headers = { Authorization: `Bearer ${token}` };
    const range = `startAt=${startAt}&endAt=${endAt}`;

    const [statsRes, pagesRes] = await Promise.all([
      fetch(`${baseUrl}/api/websites/${websiteId}/stats?${range}`, {
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }),
      fetch(
        `${baseUrl}/api/websites/${websiteId}/metrics?type=path&${range}&limit=5`,
        { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
      ),
    ]);

    if (!statsRes.ok) {
      // Jeton probablement expiré côté serveur : forcer une reconnexion au
      // prochain affichage plutôt que de rester bloqué une heure.
      cachedToken = null;
      return null;
    }

    const stats = parseStats(await statsRes.json());
    if (!stats) return null;

    const topPages = pagesRes.ok ? parseTopPages(await pagesRes.json(), 5) : [];
    return { ...stats, topPages };
  } catch {
    // Umami injoignable, DNS, timeout : la tuile affichera « Indisponible ».
    return null;
  }
}
