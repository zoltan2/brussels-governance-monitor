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
  '.pagefind': 'application/octet-stream',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
};

// Extensions that contain pre-compressed (gzip) data from pagefind
const PRECOMPRESSED = new Set(['.pf_meta', '.pf_fragment', '.pf_index', '.pagefind']);

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

  const fullPath = join(process.cwd(), 'pagefind-index', filePath);

  try {
    const data = await readFile(fullPath);
    const ext = '.' + filePath.split('.').pop();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    };

    // Pagefind binary files are already gzip-compressed internally.
    // Pagefind JS decompresses them itself. We must prevent the CDN/browser
    // from touching the encoding — identity = "serve raw bytes, no transform".
    if (PRECOMPRESSED.has(ext)) {
      headers['Content-Encoding'] = 'identity';
      headers['Cache-Control'] = 'public, max-age=86400, s-maxage=86400, no-transform';
    }

    return new NextResponse(data, { headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
