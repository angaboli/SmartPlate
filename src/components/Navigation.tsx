'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Brain, Utensils, User, Shield, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

interface NavigationProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function Navigation({ onClose, isMobile }: NavigationProps) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? 'user';

  const navItems = [
    { id: 'home', href: '/', icon: Home, label: t('nav.home'), show: true },
    { id: 'recipes', href: '/recipes', icon: Utensils, label: t('nav.recipes'), show: true },
    { id: 'dashboard', href: '/dashboard', icon: Brain, label: t('nav.aiCoach'), show: true },
    { id: 'manage', href: '/dashboard/recipes/manage', icon: BookOpen, label: t('nav.myRecipes'), show: role === 'editor' || role === 'admin' },
    { id: 'admin', href: '/dashboard/admin', icon: Shield, label: t('nav.admin'), show: role === 'admin' },
    { id: 'profile', href: '/profile', icon: User, label: t('nav.profile'), show: true },
  ];

  return (
    <nav className={`${isMobile ? 'flex flex-col p-2' : 'flex flex-row py-2'} gap-1`}>
      {navItems.filter((item) => item.show).map((item) => {
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
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
