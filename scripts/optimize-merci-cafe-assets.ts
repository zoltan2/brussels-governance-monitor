// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { mkdir, unlink, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT_DIR = resolve(ROOT, 'public/merci-cafe');

const BRIEFING_COVER_URL =
  'https://podcast.governance.brussels/media/podcasts/lebriefingbgm/cover_medium.webp';

async function optimizeLocal(params: {
  src: string;
  dest: string;
  width: number;
  height: number;
  quality?: number;
}) {
  const { src, dest, width, height, quality = 85 } = params;
  await sharp(src)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .webp({ quality })
    .toFile(dest);
  console.log(`  ✓ ${src.replace(ROOT + '/', '')} → ${dest.replace(ROOT + '/', '')}`);
}

async function downloadAndOptimize(params: {
  url: string;
  dest: string;
  width: number;
  quality?: number;
}) {
  const { url, dest, width, quality = 85 } = params;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed with HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await sharp(buffer)
    .resize(width, width, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toFile(dest);
  console.log(`  ✓ ${url} → ${dest.replace(ROOT + '/', '')}`);
}

async function tryUnlink(path: string, label: string) {
  try {
    await access(path);
    await unlink(path);
    console.log(`  ✓ deleted source: ${label}`);
  } catch {
    console.log(`  ⃝ skipped (not present): ${label}`);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('Optimizing local images…');
  await optimizeLocal({
    src: resolve(ROOT, 'zoltan.png'),
    dest: resolve(OUT_DIR, 'zoltan.webp'),
    width: 400,
    height: 400,
    quality: 88,
  });
  await optimizeLocal({
    src: resolve(ROOT, 'signal_bgm.png'),
    dest: resolve(OUT_DIR, 'signal-bgm.webp'),
    width: 800,
    height: 450,
  });

  console.log('\nDownloading + optimizing remote image…');
  await downloadAndOptimize({
    url: BRIEFING_COVER_URL,
    dest: resolve(OUT_DIR, 'briefing-bgm.webp'),
    width: 600,
  });

  console.log('\nCleaning up repo root…');
  await tryUnlink(resolve(ROOT, 'zoltan.png'), 'zoltan.png');
  await tryUnlink(resolve(ROOT, 'signal_bgm.png'), 'signal_bgm.png');

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
