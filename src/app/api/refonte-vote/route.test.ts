// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Si la route se remettait a enregistrer, ces deux espions le diraient : un
// vote accepte passe par recordVote, un opt-in par addContact.
const { recordVote, addContact } = vi.hoisted(() => ({
  recordVote: vi.fn(async () => 'id-test'),
  addContact: vi.fn(async () => undefined),
}));
vi.mock('@/lib/refonte-votes', () => ({ recordVote }));
vi.mock('@/lib/resend', () => ({ addContact }));
// Hors d'une requete Next, `cookies()` leve une erreur : l'ancienne route
// echouerait pour cette raison-la, sans que le test prouve rien sur le vote.
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

import { POST as postSansArgument } from './route';

// La route close n'a pas besoin de la requete ; on la lui passe quand meme,
// comme Next.js, pour que le test vaille aussi contre l'ancienne route.
const POST = postSansArgument as unknown as (req: NextRequest) => Promise<Response> | Response;

const VOTE_VALIDE = {
  axis1: 'thermometre',
  axis2: 'sobre_actuel',
  axis3: 'digest',
  axis4: 'hebdo',
  axis5: 'standard',
  comment: 'test',
  email: 'votant@example.org',
  emailOptIn: true,
};

function requete(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/refonte-vote', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/refonte-vote (consultation close)', () => {
  beforeEach(() => {
    recordVote.mockClear();
    addContact.mockClear();
  });

  it('refuse un vote valide envoye directement a la route, en 410', async () => {
    const res = await POST(requete(VOTE_VALIDE));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toBe('consultation_closed');
    expect(json.message).toMatch(/close/);
  });

  it("n'enregistre rien et ne transmet aucune adresse a Resend", async () => {
    await POST(requete(VOTE_VALIDE));
    expect(recordVote).not.toHaveBeenCalled();
    expect(addContact).not.toHaveBeenCalled();
  });

  it('ne pose pas le cookie anti-double-vote', async () => {
    const res = await POST(requete(VOTE_VALIDE));
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
