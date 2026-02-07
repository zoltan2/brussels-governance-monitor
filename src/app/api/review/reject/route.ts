import { NextResponse } from 'next/server';
import { z } from 'zod';

const rejectSchema = z.object({
  slug: z.string().min(1),
  type: z.enum(['domain', 'solution', 'sector', 'comparison']),
  locale: z.string().min(2).max(2),
  reason: z.enum(['out-of-scope', 'insufficient-source', 'duplicate', 'not-priority', 'factual-error']),
});

const CONTENT_DIRS: Record<string, string> = {
  domain: 'content/domain-cards',
  solution: 'content/solution-cards',
  sector: 'content/sector-cards',
  comparison: 'content/comparison-cards',
};

export async function POST(request: Request) {
  try {
    // Auth check
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('x-admin-secret');
    if (authHeader !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await request.json();
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { slug, type, locale, reason } = parsed.data;
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

    // 1. Get current file to get SHA
    const getRes = await fetch(apiBase, { headers });
    if (!getRes.ok) {
      return NextResponse.json({ error: 'File not found on GitHub' }, { status: 404 });
    }

    const fileData = await getRes.json();

    // 2. Delete the file (rejected drafts are removed)
    const deleteRes = await fetch(apiBase, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({
        message: `content: reject ${type} card "${slug}" (${locale}) — reason: ${reason}`,
        sha: fileData.sha,
      }),
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.text();
      return NextResponse.json(
        { error: 'Failed to delete', details: err },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Rejected ${type}/${slug}.${locale} — ${reason}`,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
