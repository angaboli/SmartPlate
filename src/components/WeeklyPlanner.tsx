'use client';

import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, ShoppingCart, Plus, Pencil, Trash2, Sparkles, Loader2, Download, Sunrise, Sun, Moon, Apple } from 'lucide-react';
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
  onMoveMeal?: (mealId: string, newDayIndex: number) => void;
  onOptimizeWithAI?: () => void;
  isOptimizing?: boolean;
}

const MEAL_DRAG_TYPE = 'PLANNER_MEAL';

interface MealDragItem {
  id: string;
  dayIndex: number;
}

const mealTypeColors: Record<Meal['type'], string> = {
  breakfast: 'bg-[#E9C46A]/20 text-[#8A6A4F] border-[#E9C46A]',
  lunch: 'bg-primary/20 text-primary border-primary',
  dinner: 'bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261]',
  snack: 'bg-secondary text-primary border-primary/20',
};

const mealTypeIcons: Record<Meal['type'], typeof Sunrise> = {
  breakfast: Sunrise,
  lunch: Sun,
  snack: Apple,
  dinner: Moon,
};

interface MealCardProps {
  meal: Meal;
  dayIndex: number;
  label: string;
  onEditMeal?: (meal: Meal, dayIndex: number) => void;
  onDeleteMeal?: (mealId: string) => void;
}

function MealCard({ meal, dayIndex, label, onEditMeal, onDeleteMeal }: MealCardProps) {
  const [{ isDragging }, dragRef] = useDrag<MealDragItem, unknown, { isDragging: boolean }>(
    () => ({
      type: MEAL_DRAG_TYPE,
      item: { id: meal.id, dayIndex },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [meal.id, dayIndex],
  );

  const MealIcon = mealTypeIcons[meal.type];

  return (
    <div
      ref={(node) => { dragRef(node); }}
      className={`group relative rounded-lg border p-3 transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${
        mealTypeColors[meal.type]
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2 pr-16">
        <MealIcon className="h-4 w-4 shrink-0" />
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium uppercase opacity-70">{label}</p>
          <p className="font-medium leading-tight line-clamp-2">{meal.name}</p>
          <p className="text-sm opacity-70">{meal.calories > 0 ? `${meal.calories} kcal` : '-- kcal'}</p>
        </div>
      </div>
      {(onEditMeal || onDeleteMeal) && (
        <div className="absolute right-2 top-2 flex gap-1 z-10">
          {onEditMeal && (
            <button
              type="button"
              onClick={() => onEditMeal(meal, dayIndex)}
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
  );
}

interface DayMealsGridProps {
  dayIndex: number;
  onMoveMeal?: (mealId: string, newDayIndex: number) => void;
  children: React.ReactNode;
}

function DayMealsGrid({ dayIndex, onMoveMeal, children }: DayMealsGridProps) {
  const [{ isOver, canDrop }, dropRef] = useDrop<MealDragItem, unknown, { isOver: boolean; canDrop: boolean }>(
    () => ({
      accept: MEAL_DRAG_TYPE,
      canDrop: (item) => item.dayIndex !== dayIndex,
      drop: (item) => onMoveMeal?.(item.id, dayIndex),
      collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }),
    [dayIndex, onMoveMeal],
  );

  return (
    <div
      ref={(node) => { dropRef(node); }}
      className={`grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 transition-colors ${
        isOver && canDrop ? 'bg-primary/5' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function WeeklyPlanner({
  weekData,
  onRegenerateWeek,
  onGenerateGroceryList,
  isRegenerating,
  onAddMeal,
  onEditMeal,
  onDeleteMeal,
  onMoveMeal,
  onOptimizeWithAI,
  isOptimizing,
}: WeeklyPlannerProps) {
  const { t, language } = useLanguage();

  const handleDownloadPDF = async () => {
    await generatePlannerPDF(weekData, language);
    toast.success(t('planner.downloaded'));
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
    <DndProvider backend={HTML5Backend}>
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

            <DayMealsGrid dayIndex={day.dayIndex} onMoveMeal={onMoveMeal}>
              {sortMeals(day.meals).map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  dayIndex={day.dayIndex}
                  label={t(`tag.${meal.type}`)}
                  onEditMeal={onEditMeal}
                  onDeleteMeal={onDeleteMeal}
                />
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
            </DayMealsGrid>
          </div>
        ))}
      </div>
    </div>
    </DndProvider>
  );
}
