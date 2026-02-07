import { createHmac } from 'crypto';

const TOKEN_EXPIRY_HOURS = 48;

function getSecret(): string {
  const secret = process.env.RESEND_API_KEY;
  if (!secret) throw new Error('RESEND_API_KEY required for token generation');
  return secret;
}

interface TokenPayload {
  email: string;
  locale: string;
  topics: string[];
}

export function generateConfirmToken(payload: TokenPayload): string {
  const expiry = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const data = JSON.stringify({ ...payload, exp: expiry });
  const encoded = Buffer.from(data).toString('base64url');
  const signature = createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyConfirmToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expectedSig = createHmac('sha256', getSecret()).update(encoded).digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return { email: data.email, locale: data.locale, topics: data.topics };
  } catch {
    return null;
  }
}
