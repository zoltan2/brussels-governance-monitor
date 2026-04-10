#!/usr/bin/env node

/**
 * SRI Hash Checker for Umami Analytics Script
 *
 * Fetches the current Umami script from cloud.umami.is,
 * computes its SHA-384 hash, and compares it against the
 * integrity attribute in all layout files.
 *
 * Usage:
 *   node scripts/check-sri.mjs          # exits 0 if match, 1 if mismatch
 *   node scripts/check-sri.mjs --fix    # automatically updates all layout files
 *
 * Added to npm scripts as: npm run check:sri
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UMAMI_URL = 'https://cloud.umami.is/script.js';

// All layout files that contain Umami SRI hashes
const LAYOUT_FILES = [
  resolve(__dirname, '../src/app/[locale]/layout.tsx'),
  resolve(__dirname, '../src/app/digest/layout.tsx'),
  resolve(__dirname, '../src/app/livre/layout.tsx'),
];

const SRI_REGEX = /integrity="sha384-([A-Za-z0-9+/=]+)"/g;

async function fetchRemoteHash() {
  const res = await fetch(UMAMI_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${UMAMI_URL}: ${res.status} ${res.statusText}`);
  }
  const body = await res.arrayBuffer();
  const hash = createHash('sha384').update(Buffer.from(body)).digest('base64');
  return hash;
}

async function readCurrentHashes() {
  const results = [];
  for (const path of LAYOUT_FILES) {
    const content = await readFile(path, 'utf-8');
    const match = content.match(/integrity="sha384-([A-Za-z0-9+/=]+)"/);
    if (match) {
      results.push({ path, hash: match[1], content });
    }
  }
  return results;
}

async function main() {
  const fix = process.argv.includes('--fix');

  try {
    const [remoteHash, layoutData] = await Promise.all([
      fetchRemoteHash(),
      readCurrentHashes(),
    ]);

    const mismatches = layoutData.filter((l) => l.hash !== remoteHash);

    if (mismatches.length === 0) {
      console.log(`SRI hash OK — sha384-${remoteHash} (${layoutData.length} files checked)`);
      process.exit(0);
    }

    console.error(`SRI MISMATCH in ${mismatches.length}/${layoutData.length} files!`);
    console.error(`  Remote:  sha384-${remoteHash}`);
    for (const m of mismatches) {
      console.error(`  ${m.path}: sha384-${m.hash}`);
    }

    if (fix) {
      let updated = 0;
      for (const m of mismatches) {
        const newContent = m.content.replace(
          SRI_REGEX,
          `integrity="sha384-${remoteHash}"`,
        );
        await writeFile(m.path, newContent, 'utf-8');
        updated++;
        console.log(`  FIXED: ${m.path}`);
      }
      console.log(`\n${updated} file(s) updated to sha384-${remoteHash}`);
      process.exit(0); // exit 0 on successful fix
    } else {
      console.error('\nUmami has updated their script. Analytics may be blocked.');
      console.error('Run: npm run check:sri -- --fix');
      process.exit(1);
    }
  } catch (err) {
    console.error(`SRI check failed: ${err.message}`);
    process.exit(2);
  }
}

main();
