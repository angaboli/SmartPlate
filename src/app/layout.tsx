import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Mulish } from 'next/font/google';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { AppShell } from '@/components/layout/AppShell';
import type { Language } from '@/store/slices/languageSlice';
import '@/styles/index.css';

const mulish = Mulish({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mulish',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SmartPlate — Smarter meals, powered by AI',
    template: '%s | SmartPlate',
  },
  description:
    'Track, analyze and improve your nutrition effortlessly with SmartPlate. AI-powered meal analysis, recipe discovery, and personalized meal planning.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('smartplate-language')?.value;
  const initialLanguage: Language = langCookie === 'fr' ? 'fr' : 'en';

  return (
    <html lang={initialLanguage} suppressHydrationWarning>
      <body className={`${mulish.variable} font-sans antialiased`}>
        <StoreProvider initialLanguage={initialLanguage}>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
