import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Login',
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const session = await auth();
  if (session) {
    redirect(`/${locale}/review`);
  }

  const t = await getTranslations('login');

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <div className="w-full max-w-sm px-4">
        <h1 className="mb-6 text-2xl font-bold text-neutral-900">
          {t('title')}
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          {t('description')}
        </p>
        <LoginForm
          locale={locale}
          labels={{
            email: t('email'),
            password: t('password'),
            submit: t('submit'),
            error: t('error'),
          }}
        />
      </div>
    </div>
  );
}
