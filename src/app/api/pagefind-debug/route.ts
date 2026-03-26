// Temporary debug route — remove after fixing pagefind
import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

async function listDir(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.slice(0, 20);
  } catch (err) {
    return [`ERROR: ${err}`];
  }
}

export async function GET() {
  const cwd = process.cwd();
  const results: Record<string, unknown> = {
    cwd,
    '__dirname': __dirname,
  };

  // Check various possible locations
  const paths = [
    join(cwd, '.next', 'server', 'pagefind'),
    join(cwd, 'public', 'pagefind'),
    join(cwd, '.next', 'server'),
    join(cwd, '.next', 'static', 'pagefind'),
    join(cwd, '.next'),
    cwd,
  ];

  for (const p of paths) {
    try {
      const s = await stat(p);
      results[p] = s.isDirectory() ? await listDir(p) : 'FILE';
    } catch {
      results[p] = 'NOT_FOUND';
    }
  }

  return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
}
