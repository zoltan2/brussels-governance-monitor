#!/usr/bin/env node

/**
 * SRI Hash Checker for Umami Analytics Script
 *
 * Fetches the current Umami script from cloud.umami.is,
 * computes its SHA-384 hash, and compares it against the
 * integrity attribute in layout.tsx.
 *
 * Usage:
 *   node scripts/check-sri.mjs          # exits 0 if match, 1 if mismatch
 *   node scripts/check-sri.mjs --fix    # outputs the new hash for copy-paste
 *
 * Added to npm scripts as: npm run check:sri
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UMAMI_URL = 'https://cloud.umami.is/script.js';
const LAYOUT_PATH = resolve(__dirname, '../src/app/[locale]/layout.tsx');

async function fetchRemoteHash() {
  const res = await fetch(UMAMI_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${UMAMI_URL}: ${res.status} ${res.statusText}`);
  }
  const body = await res.arrayBuffer();
  const hash = createHash('sha384').update(Buffer.from(body)).digest('base64');
  return hash;
}

async function readCurrentHash() {
  const content = await readFile(LAYOUT_PATH, 'utf-8');
  const match = content.match(/integrity="sha384-([A-Za-z0-9+/=]+)"/);
  if (!match) {
    throw new Error(`No SRI integrity attribute found in ${LAYOUT_PATH}`);
  }
  return match[1];
}

async function main() {
  const fix = process.argv.includes('--fix');

  try {
    const [remoteHash, currentHash] = await Promise.all([
      fetchRemoteHash(),
      readCurrentHash(),
    ]);

    if (remoteHash === currentHash) {
      console.log(`SRI hash OK — sha384-${currentHash}`);
      process.exit(0);
    }

    console.error(`SRI MISMATCH detected!`);
    console.error(`  Current:  sha384-${currentHash}`);
    console.error(`  Expected: sha384-${remoteHash}`);
    console.error('');

    if (fix) {
      console.log('To fix, replace the integrity attribute in layout.tsx:');
      console.log(`  integrity="sha384-${remoteHash}"`);
    } else {
      console.error('Umami has updated their script. Analytics may be blocked.');
      console.error('Run: npm run check:sri -- --fix');
    }

    process.exit(1);
  } catch (err) {
    console.error(`SRI check failed: ${err.message}`);
    process.exit(2);
  }
}

main();
