// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { safeUrl } from './safe-url';

describe('safeUrl', () => {
  it('accepts valid https URLs', () => {
    expect(safeUrl('https://www.uvcw.be/insertion/actus/art-9826')).toBe('https://www.uvcw.be/insertion/actus/art-9826');
    expect(safeUrl('https://example.com/')).toBe('https://example.com/');
    expect(safeUrl('https://example.com/path?query=1#fragment')).toBe('https://example.com/path?query=1#fragment');
  });

  it('rejects http (insecure)', () => {
    expect(safeUrl('http://example.com/')).toBeNull();
  });

  it('rejects javascript: scheme (XSS direct)', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(safeUrl('javascript:void(0)')).toBeNull();
  });

  it('rejects data: scheme (XSS via base64 HTML)', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBeNull();
  });

  it('rejects other dangerous schemes', () => {
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull();
    expect(safeUrl('file:///etc/passwd')).toBeNull();
    expect(safeUrl('about:blank')).toBeNull();
    expect(safeUrl('chrome://flags')).toBeNull();
  });

  it('rejects relative URLs (no base argument passed)', () => {
    expect(safeUrl('../../etc/passwd')).toBeNull();
    expect(safeUrl('./foo')).toBeNull();
    expect(safeUrl('foo/bar')).toBeNull();
    expect(safeUrl('/absolute-path')).toBeNull();
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeUrl('//evil.com/payload')).toBeNull();
  });

  it('rejects malformed URLs', () => {
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl('https://')).toBeNull();
    expect(safeUrl('https:// space.com')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(safeUrl('')).toBeNull();
  });

  it('rejects null and undefined defensively', () => {
    // Schema typing says these can't happen, but .velite JSON could drift at runtime.
    expect(safeUrl(null)).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });

  it('rejects non-string types', () => {
    // @ts-expect-error — defensive runtime check
    expect(safeUrl(42)).toBeNull();
    // @ts-expect-error -- defensive runtime check on object input
    expect(safeUrl({})).toBeNull();
    // @ts-expect-error -- defensive runtime check on array input
    expect(safeUrl([])).toBeNull();
  });
});
