// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

/**
 * Valide un chemin de retour fourni par l'extérieur (paramètre d'URL).
 *
 * Un `callbackUrl` non validé est une redirection ouverte : un lien
 * `/fr/login?callbackUrl=https://evil.example` transformerait notre domaine
 * en tremplin d'hameçonnage. On n'accepte donc qu'un chemin interne, et on
 * retombe silencieusement sur le tableau de bord dans tous les autres cas.
 */
export function safeCallbackPath(
  raw: string | null | undefined,
  locale: string,
): string {
  const fallback = `/${locale}/admin`;
  if (!raw) return fallback;

  // Une liste noire de caractères est perdue d'avance : le parseur d'URL du
  // WHATWG supprime la TABULATION en plus de CR et LF, donc `/⇥//evil.example`
  // traverse un filtre sur [\r\n] et résout sur une autre origine. Vérifié.
  // On refuse donc tout caractère de contrôle, puis on laisse le parseur
  // trancher plutôt que d'essayer de deviner à sa place.
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return fallback;
  }

  const url = URL.parse(raw, 'https://placeholder.invalid');
  if (!url || url.origin !== 'https://placeholder.invalid') return fallback;

  const out = url.pathname + url.search;

  // Contrôler l'origine ne suffit PAS : le parseur normalise `..`, et
  // `/..//evil.example` devient le chemin `//evil.example`, qui est relatif
  // au protocole. L'origine n'est pas quittée au parsage, elle est quittée
  // au moment où ce chemin est servi dans un en-tête `Location` ou passé à
  // `router.push`. Vérifié : trois charges utiles sur trois sortaient.
  if (!out.startsWith('/') || out.startsWith('//') || out.startsWith('/\\')) {
    return fallback;
  }

  // On renvoie ce que le parseur a compris, jamais la chaîne d'entrée.
  return out;
}
