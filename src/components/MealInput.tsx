'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface MealInputProps {
  onAnalyze: (meal: string, mealType: string) => void;
  loading?: boolean;
}

export function MealInput({ onAnalyze, loading }: MealInputProps) {
  const { t } = useLanguage();

  const [mealText, setMealText] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('lunch');

  const mealTypes = [
    { id: 'breakfast', label: t('mealInput.breakfast'), icon: '🌅' },
    { id: 'lunch', label: t('mealInput.lunch'), icon: '☀️' },
    { id: 'dinner', label: t('mealInput.dinner'), icon: '🌙' },
    { id: 'snacks', label: t('mealInput.snacks'), icon: '🍎' },
  ];

  const quickAddItems = [
    'Chicken breast',
    'Brown rice',
    'Broccoli',
    'Salmon',
    'Quinoa',
    'Avocado',
    'Sweet potato',
    'Spinach',
  ];

  const handleAnalyze = () => {
    if (mealText.trim()) {
      onAnalyze(mealText, selectedMealType);
    }
  };

  const handleQuickAdd = (item: string) => {
    setMealText((prev) => (prev ? `${prev}, ${item}` : item));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('mealInput.mealType')}</label>
          <div className="flex flex-wrap gap-2">
            {mealTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedMealType === type.id ? 'default' : 'outline'}
                onClick={() => setSelectedMealType(type.id)}
                className={selectedMealType === type.id ? 'bg-primary' : ''}
              >
                <span className="mr-2">{type.icon}</span>
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('mealInput.whatDidYouEat')}</label>
          <Textarea
            placeholder={t('mealInput.placeholder')}
            value={mealText}
            onChange={(e) => setMealText(e.target.value)}
            className="min-h-[120px] resize-none bg-input-background"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('mealInput.quickAdd')}</label>
          <div className="flex flex-wrap gap-2">
            {quickAddItems.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className="cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => handleQuickAdd(item)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          onClick={handleAnalyze}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={!mealText.trim() || loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5 mr-2" />
          )}
          {loading ? t('mealInput.analyzing') : t('mealInput.analyzeAI')}
        </Button>
      </div>
    </div>
  );
}
