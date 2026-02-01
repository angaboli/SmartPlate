import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Suggestion {
  type: 'improve' | 'swap' | 'add';
  title: string;
  description: string;
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
}

export function SmartSuggestions({ suggestions }: SmartSuggestionsProps) {
  const { t } = useLanguage();

  const getIcon = (type: string) => {
    switch (type) {
      case 'improve':
        return TrendingUp;
      case 'swap':
        return ArrowRightLeft;
      default:
        return Lightbulb;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'improve':
        return 'bg-primary/10 text-primary';
      case 'swap':
        return 'bg-[#E9C46A]/10 text-[#8A6A4F]';
      default:
        return 'bg-[#F4A261]/10 text-[#F4A261]';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">{t('suggestions.title')}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {suggestions.map((suggestion, index) => {
          const Icon = getIcon(suggestion.type);
          return (
            <div
              key={index}
              className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${getColor(suggestion.type)}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold">{suggestion.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
