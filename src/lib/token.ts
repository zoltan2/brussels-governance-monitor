import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_EXPIRY_HOURS = 48;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.RESEND_API_KEY;
  if (!secret) throw new Error('AUTH_SECRET or RESEND_API_KEY required for token generation');
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

  try {
    const sigBuf = Buffer.from(signature, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return { email: data.email, locale: data.locale, topics: data.topics };
  } catch {
    return null;
  }
}
