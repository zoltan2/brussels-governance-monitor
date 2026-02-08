import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/token';
import { getResend, EMAIL_FROM } from '@/lib/resend';

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
  const adminEmail = process.env.ADMIN_EMAIL;

  // Notify admin about the unsubscribe request
  if (adminEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: EMAIL_FROM,
        to: adminEmail,
        subject: `[BGM] Désabonnement : ${email}`,
        text: `L'utilisateur ${email} s'est désabonné des alertes Brussels Governance Monitor.\n\nDate : ${new Date().toISOString()}\n\nAction requise : supprimer l'adresse de la liste d'envoi.`,
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
