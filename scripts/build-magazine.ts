#!/usr/bin/env tsx
import { resolve } from 'node:path';
import { buildMagazine } from '../src/lib/magazine/build';

const result = buildMagazine({ root: resolve(process.cwd()) });
process.exit(result.status === 'built' || result.status === 'skipped' ? 0 : 1);
