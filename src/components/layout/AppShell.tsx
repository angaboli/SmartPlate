'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Desktop Navigation - Sticky */}
      <div className="sticky hidden md:block top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="overflow-x-auto scrollbar-hide">
            <Navigation />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          <Navigation
            onClose={() => setMobileMenuOpen(false)}
            isMobile
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:px-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-lg">🍽️</span>
                </div>
                <h3 className="font-semibold">SmartPlate</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('footer.tagline')}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/dashboard" className="hover:text-primary">
                    {t('footer.aiCoach')}
                  </Link>
                </li>
                <li>
                  <Link href="/recipes" className="hover:text-primary">
                    {t('footer.recipes')}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-primary">
                    {t('footer.mealPlanner')}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">{t('footer.safariTaste')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/recipes" className="hover:text-primary">
                    {t('footer.globalRecipes')}
                  </Link>
                </li>
                <li>
                  <button className="hover:text-primary">{t('footer.foodDiscovery')}</button>
                </li>
                <li>
                  <button className="hover:text-primary">{t('footer.flavorProfiles')}</button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button className="hover:text-primary">{t('footer.about')}</button>
                </li>
                <li>
                  <button className="hover:text-primary">{t('footer.privacy')}</button>
                </li>
                <li>
                  <button className="hover:text-primary">{t('footer.terms')}</button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
