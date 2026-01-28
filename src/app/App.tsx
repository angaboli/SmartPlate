import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CookLaterProvider } from '@/contexts/CookLaterContext';
import { Header } from '@/app/components/Header';
import { Navigation } from '@/app/components/Navigation';
import { HomePage } from '@/app/pages/HomePage';
import { DashboardPage } from '@/app/pages/DashboardPage';
import { RecipesPage } from '@/app/pages/RecipesPage';
import { ProfilePage } from '@/app/pages/ProfilePage';
import { Sheet, SheetContent } from '@/app/components/ui/sheet';
import { Toaster } from '@/app/components/ui/sonner';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'dashboard':
        return <DashboardPage />;
      case 'recipes':
        return <RecipesPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        <CookLaterProvider>
          <div className="min-h-screen bg-background">
            <Header onMenuClick={() => setMobileMenuOpen(true)} />
            
            {/* Desktop Navigation - Now Sticky */}
            <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto px-4 md:px-6">
                <div className="overflow-x-auto scrollbar-hide">
                  <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
                </div>
              </div>
            </div>

            {/* Mobile Navigation Sheet */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetContent side="left" className="w-64 p-0">
                <Navigation
                  currentPage={currentPage}
                  onNavigate={setCurrentPage}
                  onClose={() => setMobileMenuOpen(false)}
                  isMobile
                />
              </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 md:px-6">
              {renderPage()}
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
                      <h3 className="font-semibold">SmartPlate AI</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Smarter meals, powered by AI. Your companion for better nutrition.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Product</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>
                        <button onClick={() => setCurrentPage('dashboard')} className="hover:text-primary">
                          AI Coach
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setCurrentPage('recipes')} className="hover:text-primary">
                          Recipes
                        </button>
                      </li>
                      <li>
                        <button onClick={() => setCurrentPage('dashboard')} className="hover:text-primary">
                          Meal Planner
                        </button>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">SafariTaste</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>
                        <button onClick={() => setCurrentPage('recipes')} className="hover:text-primary">
                          Global Recipes
                        </button>
                      </li>
                      <li>
                        <button className="hover:text-primary">Food Discovery</button>
                      </li>
                      <li>
                        <button className="hover:text-primary">Flavor Profiles</button>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Company</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>
                        <button className="hover:text-primary">About</button>
                      </li>
                      <li>
                        <button className="hover:text-primary">Privacy</button>
                      </li>
                      <li>
                        <button className="hover:text-primary">Terms</button>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                  <p>© 2026 SmartPlate AI. All rights reserved.</p>
                </div>
              </div>
            </footer>
            <Toaster />
          </div>
        </CookLaterProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}