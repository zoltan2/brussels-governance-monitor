// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getContentPr,
  getPrFiles,
  getCheckState,
  CONTENT_BRANCH_PREFIX,
  normalizeRepo,
} from '@/lib/github-pr';
import { isMergeableFileSet } from '@/lib/mergeable-files';

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
  // LA garde décisive : la branche doit venir de NOTRE dépôt. Sur une PR de
  // fork, `pr.branch` est le nom choisi par un inconnu — vérifier le nom seul
  // ne vérifie rien. GitHub est insensible à la casse sur `owner/name`, et
  // `GITHUB_REPO` peut porter un `.git`, une URL complète ou une barre
  // finale : on compare deux valeurs normalisées, jamais une brute à une
  // normalisée.
  if (pr.headRepo?.toLowerCase() !== normalizeRepo(repo)) {
    return NextResponse.json({ error: 'PR extérieure au dépôt' }, { status: 403 });
  }
  if (!pr.branch.startsWith(CONTENT_BRANCH_PREFIX)) {
    return NextResponse.json({ error: 'Branche hors périmètre' }, { status: 403 });
  }
  if (pr.baseRef !== 'main') {
    return NextResponse.json({ error: 'Branche cible inattendue' }, { status: 403 });
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
  const rejected = files.map((f) => f.path).filter((p) => !isMergeableFileSet([p]));
  if (rejected.length > 0) {
    // Nommer les coupables : un 403 aveugle sur une PR de 1480 fichiers est
    // indiagnosticable.
    return NextResponse.json(
      {
        error: `Fichiers hors périmètre : ${rejected.slice(0, 5).join(', ')}${
          rejected.length > 5 ? ` (et ${rejected.length - 5} autres)` : ''
        }`,
      },
      { status: 403 },
    );
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
