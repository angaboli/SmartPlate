'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Brain, Utensils, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavigationProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { id: 'home', href: '/', icon: Home },
  { id: 'dashboard', href: '/dashboard', icon: Brain },
  { id: 'recipes', href: '/recipes', icon: Utensils },
  { id: 'profile', href: '/profile', icon: User },
] as const;

export function Navigation({ onClose, isMobile }: NavigationProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const labels: Record<string, string> = {
    home: t('nav.home'),
    dashboard: t('nav.aiCoach'),
    recipes: t('nav.recipes'),
    profile: t('nav.profile'),
  };

  return (
    <nav className={`${isMobile ? 'flex flex-col' : 'flex flex-row py-2'} gap-1`}>
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">{t('nav.menu')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Button
            key={item.id}
            variant={isActive ? 'default' : 'ghost'}
            className={`${isMobile ? 'justify-start' : ''} ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
            asChild
            onClick={isMobile ? onClose : undefined}
          >
            <Link href={item.href}>
              <Icon className="h-4 w-4 mr-2" />
              {labels[item.id]}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
