// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readGitHubFile, writeGitHubFile } from '@/lib/github';

const localeString = z.object({
  fr: z.string(),
  nl: z.string(),
  en: z.string(),
  de: z.string(),
});

const editSchema = z.object({
  weeklyNumber: z.object({
    value: z.string().min(1),
    label: localeString,
    source: localeString,
  }).optional(),
  closingNote: localeString.optional(),
});

/**
 * POST /api/digest/edit
 * Auth-protected endpoint to update pending-digest.json
 * (weekly number and/or closing note).
 */
export const POST = auth(async function POST(req) {
  if (!req.auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const filePath = 'data/pending-digest.json';
  const file = await readGitHubFile(filePath);
  if (!file) {
    return NextResponse.json({ error: 'No pending digest found' }, { status: 404 });
  }

  const digest = JSON.parse(file.content);

  if (digest.sent) {
    return NextResponse.json({ error: 'Digest already sent, cannot edit' }, { status: 409 });
  }

  // Apply edits
  if (parsed.data.weeklyNumber) {
    digest.weeklyNumber = parsed.data.weeklyNumber;
  }
  if (parsed.data.closingNote) {
    digest.closingNote = parsed.data.closingNote;
  }

  await writeGitHubFile(
    filePath,
    JSON.stringify(digest, null, 2) + '\n',
    file.sha,
    `chore: edit pending digest ${digest.week}`,
  );

  return NextResponse.json({ success: true, week: digest.week });
});
