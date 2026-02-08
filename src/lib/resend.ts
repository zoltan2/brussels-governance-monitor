import { Resend } from 'resend';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not configured');
    _resend = new Resend(key);
  }
  return _resend;
}

export const EMAIL_FROM = 'Brussels Governance Monitor <noreply@mail.brusselsgovernance.be>';

export const TOPICS = [
  'budget',
  'mobility',
  'employment',
  'housing',
  'climate',
  'social',
  'solutions',
] as const;

export type Topic = (typeof TOPICS)[number];
