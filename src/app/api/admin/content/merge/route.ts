// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getContentPr, getPrFiles, getCheckState, normalizeRepo } from '@/lib/github-pr';
import { prRefusal, filesRefusal, checksRefusal } from '@/lib/publication-guards';

const schema = z.object({
  number: z.number().int().positive(),
  sha: z.string().regex(/^[0-9a-f]{40}$/, 'sha complet attendu'),
});
export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Garde d'origine. Le cookie de session est `SameSite=Lax`, ce qui écarte
  // un site tiers mais PAS un sous-domaine : `analytics.governance.brussels`
  // existe et sert du logiciel tiers. Et `Request.json()` ignorant le
  // `Content-Type`, un simple <form enctype="text/plain"> fabrique un corps
  // JSON valide sans déclencher de préflight CORS. Cette garde existait dans
  // le plan de l'étape 1 et avait disparu ici sans justification.
  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  const sameOrigin =
    req.headers.get('sec-fetch-site') === 'same-origin' &&
    origin !== null &&
    host !== null &&
    URL.parse(origin)?.host === host;
  if (!sameOrigin) {
    return NextResponse.json({ error: 'Origine non autorisée' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const { number, sha } = parsed.data;

  const token = process.env.GITHUB_TOKEN;
  const rawRepo = process.env.GITHUB_REPO;
  if (!token || !rawRepo) {
    return NextResponse.json({ error: 'Configuration GitHub absente' }, { status: 500 });
  }
  // `GITHUB_REPO` s'écrit souvent avec un `.git`, une barre finale ou une URL
  // complète — toutes des formes que `normalizeRepo` anticipe. Le chemin de
  // lecture (github-pr.ts) normalise déjà systématiquement ; l'appel de
  // fusion ci-dessous interpolait la valeur brute, ce qui faisait échouer la
  // fusion en 502 avec un message GitHub incompréhensible sur un dépôt lu
  // sans problème.
  const repo = normalizeRepo(rawRepo);

  // 1. La PR existe, vient d'une branche de veille, et n'a pas bougé.
  // `getContentPr` LÈVE sur tout statut autre que 404 : un 403 de quota ne
  // doit pas se lire « PR introuvable », et surtout pas traverser en 500.
  let pr;
  try {
    pr = await getContentPr(number);
  } catch {
    return NextResponse.json({ error: 'GitHub injoignable' }, { status: 502 });
  }
  if (!pr) {
    return NextResponse.json({ error: 'PR introuvable' }, { status: 404 });
  }
  // Origine, préfixe de branche, branche cible, et commit de tête : le même
  // contrat que la liste et la page-décision, écrit une seule fois dans
  // `publication-guards.ts` et testé là-bas en fonction pure.
  const prProblem = prRefusal(pr, sha, repo);
  if (prProblem) {
    return NextResponse.json({ error: prProblem.error }, { status: prProblem.status });
  }

  // 2. Les fichiers, en refusant toute liste tronquée : GitHub trie par
  //    chemin, et `src/` arrive après le millier de fichiers pagefind. Une
  //    troncature silencieuse rendrait la liste blanche contournable.
  const { files, truncated } = await getPrFiles(number);
  const filesProblem = filesRefusal(
    files.map((f) => f.path),
    truncated,
  );
  if (filesProblem) {
    return NextResponse.json({ error: filesProblem.error }, { status: filesProblem.status });
  }

  // 3. Les contrôles, relus côté serveur.
  // `getCheckState` lève sur erreur réseau : on refuse plutôt que de
  // supposer vert. Et on exige les contrôles NOMMÉS : « aucun échec » est
  // satisfait par zéro contrôle, l'état nominal d'une PR de fork.
  let checks;
  try {
    checks = await getCheckState(sha, files.map((f) => f.path));
  } catch {
    return NextResponse.json(
      { error: 'État des contrôles indisponible' },
      { status: 502 },
    );
  }
  const checksProblem = checksRefusal(checks);
  if (checksProblem) {
    return NextResponse.json({ error: checksProblem.error }, { status: checksProblem.status });
  }

  // 4. La fusion. Le `sha` est transmis à GitHub, qui refuse tout seul si la
  //    branche a bougé entre notre vérification et cet appel.
  const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${number}/merge`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ merge_method: 'squash', sha }),
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { message?: string };
    return NextResponse.json(
      { error: detail.message ?? 'GitHub a refusé la fusion' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
});
