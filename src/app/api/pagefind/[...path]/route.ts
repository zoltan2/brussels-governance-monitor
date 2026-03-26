// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.pf_meta': 'application/octet-stream',
  '.pf_fragment': 'application/octet-stream',
  '.pf_index': 'application/octet-stream',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const filePath = path.join('/');

  // Security: block path traversal
  if (filePath.includes('..') || filePath.includes('\0')) {
    return new NextResponse(null, { status: 400 });
  }

  const fullPath = join(process.cwd(), 'public', 'pagefind', filePath);

  try {
    const data = await readFile(fullPath);
    const ext = '.' + filePath.split('.').pop();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
