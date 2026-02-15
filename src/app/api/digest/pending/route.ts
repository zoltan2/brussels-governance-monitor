import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { readGitHubFile } from '@/lib/github';

/**
 * GET /api/digest/pending
 * Auth-protected — returns current pending-digest.json content.
 */
export const GET = auth(async function GET(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const file = await readGitHubFile('data/pending-digest.json');
  if (!file) {
    return NextResponse.json({ error: 'No pending digest found' }, { status: 404 });
  }

  const digest = JSON.parse(file.content);
  return NextResponse.json(digest);
});
