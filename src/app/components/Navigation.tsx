import { Home, Brain, Utensils, User, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Navigation({ currentPage, onNavigate, onClose, isMobile }: NavigationProps) {
  const { t } = useLanguage();
  
  const navItems = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'dashboard', label: t('nav.aiCoach'), icon: Brain },
    { id: 'recipes', label: t('nav.recipes'), icon: Utensils },
    { id: 'profile', label: t('nav.profile'), icon: User },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    if (isMobile && onClose) {
      onClose();
    }
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
        const isActive = currentPage === item.id;
        return (
          <Button
            key={item.id}
            variant={isActive ? 'default' : 'ghost'}
            className={`${isMobile ? 'justify-start' : ''} ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => handleNavigate(item.id)}
          >
            <Icon className="h-4 w-4 mr-2" />
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}