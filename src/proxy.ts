// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// Patterns bots probe for — return 404 immediately to avoid 500 errors
const BOT_PROBE = /^\/(\.env|\.git|\.aws|\.docker|wp-|xmlrpc|phpmyadmin|cgi-bin|admin\.php)/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BOT_PROBE.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match i18n routes + common bot probe paths (dotfiles, wp-*, xmlrpc)
  matcher: [
    '/((?!api|feed|digest|livre|_next|_vercel|.*\\..*).*)' ,
    '/(\\.env.*|xmlrpc\\.php|\\.git.*|wp-.*)',
  ],
};
