'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Meal } from '@/hooks/usePlanner';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddEditMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    calories?: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    dayIndex: number;
  }) => void;
  editingMeal?: Meal | null;
  defaultDayIndex?: number;
  defaultMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  isLoading?: boolean;
}

export function AddEditMealDialog({
  open,
  onOpenChange,
  onSave,
  editingMeal,
  defaultDayIndex = 0,
  defaultMealType = 'breakfast',
  isLoading,
}: AddEditMealDialogProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [mealType, setMealType] = useState<string>(defaultMealType);
  const [dayIndex, setDayIndex] = useState<string>(String(defaultDayIndex));

  const DAY_OPTIONS = [
    { value: '0', label: t('planner.day.monday') },
    { value: '1', label: t('planner.day.tuesday') },
    { value: '2', label: t('planner.day.wednesday') },
    { value: '3', label: t('planner.day.thursday') },
    { value: '4', label: t('planner.day.friday') },
    { value: '5', label: t('planner.day.saturday') },
    { value: '6', label: t('planner.day.sunday') },
  ];

  const MEAL_TYPE_OPTIONS = [
    { value: 'breakfast', label: t('tag.breakfast') },
    { value: 'lunch', label: t('tag.lunch') },
    { value: 'dinner', label: t('tag.dinner') },
    { value: 'snack', label: t('tag.snack') },
  ];

  useEffect(() => {
    if (open) {
      if (editingMeal) {
        setName(editingMeal.name);
        setCalories(String(editingMeal.calories));
        setMealType(editingMeal.type);
      } else {
        setName('');
        setCalories('');
        setMealType(defaultMealType);
        setDayIndex(String(defaultDayIndex));
      }
    }
  }, [open, editingMeal, defaultDayIndex, defaultMealType]);

  const isEditing = !!editingMeal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cal = calories.trim() ? parseInt(calories, 10) : undefined;
    if (cal !== undefined && (isNaN(cal) || cal < 0)) return;

    onSave({
      name: name.trim(),
      ...(cal !== undefined && { calories: cal }),
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      dayIndex: parseInt(dayIndex, 10),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('planner.editMeal') : t('planner.addMeal')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meal-name">{t('planner.mealName')}</Label>
            <Input
              id="meal-name"
              placeholder={t('planner.mealNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meal-calories">{t('planner.calories')} <span className="text-muted-foreground font-normal">{t('planner.caloriesOptional')}</span></Label>
            <Input
              id="meal-calories"
              type="number"
              placeholder={t('planner.caloriesPlaceholder')}
              min={0}
              max={10000}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('planner.mealType')}</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>{t('planner.day')}</Label>
              <Select value={dayIndex} onValueChange={setDayIndex}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving')}
                </>
              ) : isEditing ? (
                t('planner.updateMeal')
              ) : (
                t('planner.addMeal')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
