// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getContentPr,
  getPrFiles,
  getCheckState,
  publishablePrProblem,
} from '@/lib/github-pr';
import { fileSetRefusal } from '@/lib/mergeable-files';

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
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return NextResponse.json({ error: 'Configuration GitHub absente' }, { status: 500 });
  }

  // 1. La PR existe, vient d'une branche de veille, et n'a pas bougé.
  const pr = await getContentPr(number);
  if (!pr) {
    return NextResponse.json({ error: 'PR introuvable' }, { status: 404 });
  }
  // Origine, préfixe de branche, branche cible : le même contrat que la liste
  // et la page-décision, écrit une seule fois.
  const problem = publishablePrProblem(pr, repo);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 403 });
  }
  if (pr.sha !== sha) {
    return NextResponse.json(
      { error: 'La branche a changé depuis l\'affichage. Recharger la page.' },
      { status: 409 },
    );
  }

  // 2. Les fichiers, en refusant toute liste tronquée : GitHub trie par
  //    chemin, et `src/` arrive après le millier de fichiers pagefind. Une
  //    troncature silencieuse rendrait la liste blanche contournable.
  const { files, truncated } = await getPrFiles(number);
  if (truncated) {
    return NextResponse.json(
      { error: 'Liste de fichiers incomplète, publication refusée' },
      { status: 422 },
    );
  }
  // Même fonction que la page-décision : le verdict affiché et le refus du
  // serveur ne peuvent plus diverger.
  const refusal = fileSetRefusal(files.map((f) => f.path));
  if (refusal) {
    return NextResponse.json({ error: refusal }, { status: 403 });
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
  if (checks.pending > 0 || checks.failed.length > 0 || checks.missing.length > 0) {
    return NextResponse.json(
      { error: `Contrôles non satisfaits : ${[...checks.failed, ...checks.missing].join(', ')}` },
      { status: 409 },
    );
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
