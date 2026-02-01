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

const DAY_OPTIONS = [
  { value: '0', label: 'Monday' },
  { value: '1', label: 'Tuesday' },
  { value: '2', label: 'Wednesday' },
  { value: '3', label: 'Thursday' },
  { value: '4', label: 'Friday' },
  { value: '5', label: 'Saturday' },
  { value: '6', label: 'Sunday' },
];

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

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
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [mealType, setMealType] = useState<string>(defaultMealType);
  const [dayIndex, setDayIndex] = useState<string>(String(defaultDayIndex));

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
          <DialogTitle>{isEditing ? 'Edit Meal' : 'Add Meal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meal-name">Meal Name</Label>
            <Input
              id="meal-name"
              placeholder="e.g. Grilled chicken with rice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meal-calories">Calories <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="meal-calories"
              type="number"
              placeholder="Leave empty — AI will estimate"
              min={0}
              max={10000}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Meal Type</Label>
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
              <Label>Day</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Meal'
              ) : (
                'Add Meal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
