import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM, removeContact } from '@/lib/resend';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const locale = searchParams.get('locale') || 'fr';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/unsubscribed?status=error`
    );
  }

  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return NextResponse.redirect(
      `${siteUrl}/${locale}/subscribe/unsubscribed?status=error`
    );
  }

  const { email } = payload;

  // Mark as unsubscribed in Resend Contacts
  if (process.env.RESEND_API_KEY) {
    try {
      await removeContact(email);
    } catch {
      // Contact update failure should not block the unsubscribe flow
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  // Notify admin about the unsubscribe
  if (adminEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: EMAIL_FROM,
        to: adminEmail,
        subject: `[BGM] Désabonnement : ${email}`,
        text: `L'utilisateur ${email} s'est désabonné des alertes Brussels Governance Monitor.\n\nDate : ${new Date().toISOString()}\n\nLe contact a été automatiquement marqué comme désabonné dans Resend.`,
        tags: [{ name: 'type', value: 'unsubscribe-notification' }],
      });
    } catch {
      // Notification failure should not block the unsubscribe flow
    }
  }

  return NextResponse.redirect(
    `${siteUrl}/${locale}/subscribe/unsubscribed?status=success`
  );
}
