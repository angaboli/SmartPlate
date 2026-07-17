'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Plus, Loader2, Sunrise, Sun, Moon, Apple, Camera } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface MealInputProps {
  onAnalyze: (meal: string, mealType: string) => void;
  onScanPhoto: (file: File, mealType: string) => void;
  loading?: boolean;
  scanning?: boolean;
}

export function MealInput({ onAnalyze, onScanPhoto, loading, scanning }: MealInputProps) {
  const { t } = useLanguage();

  const [mealText, setMealText] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('lunch');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const mealTypes = [
    { id: 'breakfast', label: t('mealInput.breakfast'), icon: Sunrise },
    { id: 'lunch', label: t('mealInput.lunch'), icon: Sun },
    { id: 'dinner', label: t('mealInput.dinner'), icon: Moon },
    { id: 'snacks', label: t('mealInput.snacks'), icon: Apple },
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

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('mealInput.photoInvalidType'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('mealInput.photoTooLarge'));
      return;
    }

    onScanPhoto(file, selectedMealType);
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
                <type.icon className="mr-2 h-4 w-4" />
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={handleAnalyze}
            size="lg"
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={!mealText.trim() || loading || scanning}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 mr-2" />
            )}
            {loading ? t('mealInput.analyzing') : t('mealInput.analyzeAI')}
          </Button>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelected}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={loading || scanning}
            onClick={() => photoInputRef.current?.click()}
          >
            {scanning ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Camera className="h-5 w-5 mr-2" />
            )}
            {scanning ? t('mealInput.scanning') : t('mealInput.scanPhoto')}
          </Button>
        </div>
      </div>
    </div>
  );
}
