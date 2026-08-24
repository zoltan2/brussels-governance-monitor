// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { clientIp } from '@/lib/client-ip';

// Simple in-memory rate limiter for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export interface AdminConnecte {
  id: string;
  email: string;
  name: string;
}

/** Durée plancher de toute tentative, succès comme échec. Choisie au-dessus du
 *  pire chemin réel — un `bcrypt.compare` au coût 10 — pour qu'aucune branche ne
 *  puisse être distinguée à la durée. */
const PLANCHER_MS = 600;

async function rendreAprèsPlancher<T>(valeur: T, depuis: number): Promise<T> {
  const reste = PLANCHER_MS - (Date.now() - depuis);
  if (reste > 0) await new Promise((r) => setTimeout(r, reste));
  return valeur;
}

/**
 * PAS DE LEURRE, PAS DE BRANCHE : on fait TOUJOURS le `bcrypt.compare`.
 *
 * La version précédente retournait avant toute vérification quand l'adresse ne
 * correspondait pas. Un leurre au mauvais algorithme n'aurait rien corrigé — le
 * hash de BGM est un bcrypt, dont le coût est inscrit dans le hash lui-même.
 * Comparer contre le hash RÉEL, quelle que soit l'adresse, égalise les durées
 * par construction et ne peut pas se désynchroniser d'un paramètre.
 */
export async function authorizeAdmin(
  email: string | undefined,
  password: string | undefined,
  ip: string,
): Promise<AdminConnecte | null> {
  const debut = Date.now();

  /* LE LIMITEUR EXISTANT NE CHANGE PAS — sa fenêtre de quinze minutes est
     correcte. Ce qui change, c'est l'IP qu'on lui donne.

     DÉFENSE EN PROFONDEUR, ET NON FERMETURE D'UNE FAILLE VIVANTE. La lecture
     précédente prenait la PREMIÈRE valeur de `x-forwarded-for`. Derrière notre
     Caddy, qui réécrit l'en-tête avec `{client_ip}` — une valeur unique — la
     première valait la dernière, et le comptage était déjà juste. Ce qui
     change : `clientIp` reste correct le jour où cette configuration bougerait,
     puisque le comportement par défaut de Caddy est d'AJOUTER au lieu de
     remplacer, et qu'alors la première valeur serait celle du client. */
  if (isRateLimited(ip)) return rendreAprèsPlancher(null, debut);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminHash) {
    console.error('[auth] ADMIN_EMAIL ou ADMIN_PASSWORD_HASH absente : connexion impossible');
    return rendreAprèsPlancher(null, debut);
  }

  const emailOk = email === adminEmail;
  const motDePasseOk = await bcrypt.compare(password ?? '', adminHash);

  if (!emailOk || !motDePasseOk) {
    console.warn(`[auth] échec de connexion depuis ${ip}`);
    return rendreAprèsPlancher(null, debut);
  }
  console.info(`[auth] connexion réussie depuis ${ip}`);
  return rendreAprèsPlancher({ id: '1', email: adminEmail, name: 'Admin' }, debut);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        return authorizeAdmin(
          credentials?.email as string | undefined,
          credentials?.password as string | undefined,
          clientIp(request?.headers ?? new Headers()),
        );
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  trustHost: true,
});
