import type { Metadata } from 'next';
import { Mulish } from 'next/font/google';
import { StoreProvider } from '@/components/providers/StoreProvider';
import { AppShell } from '@/components/layout/AppShell';
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${mulish.variable} font-sans antialiased`}>
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
