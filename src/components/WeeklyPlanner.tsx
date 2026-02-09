'use client';

import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, ShoppingCart, Plus, Pencil, Trash2, Sparkles, Loader2, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { generatePlannerPDF } from '@/lib/generatePDF';
import { toast } from 'sonner';

interface Meal {
  id: string;
  name: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayPlan {
  date: string;
  day: string;
  dayIndex: number;
  meals: Meal[];
}

interface WeeklyPlannerProps {
  weekData: DayPlan[];
  onRegenerateWeek?: () => void;
  onGenerateGroceryList?: () => void;
  isRegenerating?: boolean;
  onAddMeal?: (dayIndex: number) => void;
  onEditMeal?: (meal: Meal, dayIndex: number) => void;
  onDeleteMeal?: (mealId: string) => void;
  onOptimizeWithAI?: () => void;
  isOptimizing?: boolean;
}

export function WeeklyPlanner({
  weekData,
  onRegenerateWeek,
  onGenerateGroceryList,
  isRegenerating,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
  onOptimizeWithAI,
  isOptimizing,
}: WeeklyPlannerProps) {
  const { t, language } = useLanguage();

  const handleDownloadPDF = async () => {
    await generatePlannerPDF(weekData, language);
    toast.success(t('planner.downloaded'));
  };

  const mealTypeColors = {
    breakfast: 'bg-[#E9C46A]/20 text-[#8A6A4F] border-[#E9C46A]',
    lunch: 'bg-primary/20 text-primary border-primary',
    dinner: 'bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261]',
    snack: 'bg-secondary text-primary border-primary/20',
  };

  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    snack: '🍎',
    dinner: '🌙',
  };

  const mealTypeOrder: Record<string, number> = {
    breakfast: 0,
    lunch: 1,
    snack: 2,
    dinner: 3,
  };

  const sortMeals = (meals: Meal[]) =>
    [...meals].sort((a, b) => (mealTypeOrder[a.type] ?? 9) - (mealTypeOrder[b.type] ?? 9));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('planner.title')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOptimizeWithAI && (
            <Button variant="outline" onClick={onOptimizeWithAI} disabled={isOptimizing || isRegenerating}>
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('planner.optimizing')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('planner.optimizeAI')}
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={onRegenerateWeek} disabled={isRegenerating || isOptimizing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? t('planner.regenerating') : t('planner.regenerateWeek')}
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            {t('planner.downloadPDF')}
          </Button>
          <Button onClick={onGenerateGroceryList} className="bg-primary">
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t('planner.groceryList')}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {weekData.map((day) => (
          <div
            key={day.date}
            className="overflow-hidden rounded-xl border bg-card shadow-sm"
          >
            <div className="border-b bg-secondary/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{t(`planner.day.${day.day.toLowerCase()}`)}</h3>
                  <p className="text-sm text-muted-foreground">{day.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{t('planner.totalCalories')}</p>
                    <p className="font-semibold">
                      {day.meals.reduce((sum, meal) => sum + meal.calories, 0)} kcal
                    </p>
                  </div>
                  {onAddMeal && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onAddMeal(day.dayIndex)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {sortMeals(day.meals).map((meal) => (
                <div
                  key={meal.id}
                  className={`group relative rounded-lg border p-3 transition-all hover:shadow-md ${
                    mealTypeColors[meal.type]
                  }`}
                >
                    <div className="flex items-start gap-2 pr-16">
                    <span className="text-lg">{mealTypeIcons[meal.type]}</span>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium uppercase opacity-70">
                        {t(`tag.${meal.type}`)}
                      </p>
                      <p className="font-medium leading-tight line-clamp-2">{meal.name}</p>
                      <p className="text-sm opacity-70">{meal.calories > 0 ? `${meal.calories} kcal` : '-- kcal'}</p>
                    </div>
                  </div>
                  {(onEditMeal || onDeleteMeal) && (
                    <div className="absolute right-2 top-2 flex gap-1 z-10">
                      {onEditMeal && (
                        <button
                          type="button"
                          onClick={() => onEditMeal(meal, day.dayIndex)}
                          className="flex items-center justify-center w-7 h-7 rounded bg-background hover:bg-primary hover:text-white border shadow-sm transition-colors cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onDeleteMeal && (
                        <button
                          type="button"
                          onClick={() => onDeleteMeal(meal.id)}
                          className="flex items-center justify-center w-7 h-7 rounded bg-background hover:bg-destructive hover:text-white border shadow-sm transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {day.meals.length === 0 && (
                <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
                  {t('planner.noMeals')}{' '}
                  {onAddMeal && (
                    <button
                      type="button"
                      onClick={() => onAddMeal(day.dayIndex)}
                      className="text-primary underline"
                    >
                      {t('planner.addOne')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
