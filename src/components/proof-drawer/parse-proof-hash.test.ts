// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, expect, it } from 'vitest';
import { parseProofHash } from './parse-proof-hash';

describe('parseProofHash', () => {
  it('parses a valid hash', () => {
    expect(parseProofHash('#proof-cpas-234-vs-300:narrative')).toEqual({
      id: 'cpas-234-vs-300',
      tab: 'narrative',
    });
    expect(parseProofHash('#proof-foo:data')).toEqual({ id: 'foo', tab: 'data' });
    expect(parseProofHash('#proof-bar-baz:histoire')).toEqual({ id: 'bar-baz', tab: 'histoire' });
  });

  it('rejects tab outside allowlist', () => {
    expect(parseProofHash('#proof-foo:bidon')).toBeNull();
    expect(parseProofHash('#proof-foo:NARRATIVE')).toBeNull();
    expect(parseProofHash('#proof-foo:')).toBeNull();
    expect(parseProofHash('#proof-foo')).toBeNull();
  });

  it('rejects id with special characters (XSS / injection vectors)', () => {
    expect(parseProofHash('#proof-<script>:narrative')).toBeNull();
    expect(parseProofHash('#proof-foo"bar:narrative')).toBeNull();
    expect(parseProofHash("#proof-foo'bar:narrative")).toBeNull();
    expect(parseProofHash('#proof-foo bar:narrative')).toBeNull();
    expect(parseProofHash('#proof-foo/bar:narrative')).toBeNull();
    expect(parseProofHash('#proof-FOO:narrative')).toBeNull();
    expect(parseProofHash('#proof-foo_bar:narrative')).toBeNull();
  });

  it('rejects id exceeding 40 char cap (DoS prevention)', () => {
    const longId = 'a'.repeat(41);
    expect(parseProofHash(`#proof-${longId}:narrative`)).toBeNull();
  });

  it('accepts id at exactly 40 chars', () => {
    const okId = 'a'.repeat(40);
    expect(parseProofHash(`#proof-${okId}:narrative`)).toEqual({ id: okId, tab: 'narrative' });
  });

  it('rejects id of length 0', () => {
    expect(parseProofHash('#proof-:narrative')).toBeNull();
  });

  it('rejects malformed hash patterns', () => {
    expect(parseProofHash('#foo')).toBeNull();
    expect(parseProofHash('#proof:narrative')).toBeNull();
    expect(parseProofHash('proof-foo:narrative')).toBeNull();
    expect(parseProofHash('#proof-foo:narrative:extra')).toBeNull();
    expect(parseProofHash('#proof-foo:narrative ')).toBeNull();
    expect(parseProofHash('#proof-foo:narrative\n')).toBeNull();
  });

  it('rejects empty hash', () => {
    expect(parseProofHash('')).toBeNull();
    expect(parseProofHash('#')).toBeNull();
  });

  it('rejects null and undefined defensively', () => {
    expect(parseProofHash(null)).toBeNull();
    expect(parseProofHash(undefined)).toBeNull();
  });

  it('rejects non-string types', () => {
    // @ts-expect-error -- defensive runtime check on number input
    expect(parseProofHash(42)).toBeNull();
    // @ts-expect-error -- defensive runtime check on object input
    expect(parseProofHash({})).toBeNull();
  });
});
