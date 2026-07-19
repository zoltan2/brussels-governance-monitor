// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time check of the `Authorization: Bearer CRON_SECRET` header.
 * Plain `!==` comparison leaks timing information proportional to how many
 * leading characters match; negligible over HTTPS in practice, but a
 * standard-practice fix for a secret comparison.
 */
export function isValidCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;

  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
