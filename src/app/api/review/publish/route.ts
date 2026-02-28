// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const publishSchema = z.object({
  slug: z.string().min(1),
  type: z.enum(['domain', 'solution', 'sector', 'comparison']),
  locale: z.string().min(2).max(2),
});

const CONTENT_DIRS: Record<string, string> = {
  domain: 'content/domain-cards',
  solution: 'content/solution-cards',
  sector: 'content/sector-cards',
  comparison: 'content/comparison-cards',
};

export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Validate input
    const body = await req.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { slug, type, locale } = parsed.data;
    const dir = CONTENT_DIRS[type];
    const filePath = `${dir}/${slug}.${locale}.mdx`;

    // GitHub API config
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    if (!token || !repo) {
      return NextResponse.json({ error: 'GitHub not configured' }, { status: 503 });
    }

    const apiBase = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // 1. Get current file content
    const getRes = await fetch(apiBase, { headers });
    if (!getRes.ok) {
      const err = await getRes.text();
      return NextResponse.json(
        { error: 'File not found on GitHub', details: err },
        { status: 404 },
      );
    }

    const fileData = await getRes.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

    // 2. Remove draft: true from frontmatter
    const updated = content.replace(/^draft:\s*true\n/m, '');
    if (updated === content) {
      return NextResponse.json({ error: 'Card is not in draft state' }, { status: 400 });
    }

    // 3. Commit the change
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `content: publish ${type} card "${slug}" (${locale}) — validated via /review`,
        content: Buffer.from(updated).toString('base64'),
        sha: fileData.sha,
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.text();
      return NextResponse.json(
        { error: 'Failed to commit', details: err },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Published ${type}/${slug}.${locale}`,
      commit: (await putRes.json()).commit?.sha?.slice(0, 7),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
