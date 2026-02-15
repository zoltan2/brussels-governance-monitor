import digestLanguages from '../../../../config/digest-languages.json';

const RTL_LANGS = new Set(
  digestLanguages.filter((l) => l.rtl).map((l) => l.code),
);

export default async function DigestLangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const isRtl = RTL_LANGS.has(lang);

  return (
    <div lang={lang} dir={isRtl ? 'rtl' : 'ltr'}>
      {children}
    </div>
  );
}
