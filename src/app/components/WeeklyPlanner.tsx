import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Calendar, RefreshCw, ShoppingCart } from 'lucide-react';

interface Meal {
  id: string;
  name: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayPlan {
  date: string;
  day: string;
  meals: Meal[];
}

interface WeeklyPlannerProps {
  weekData: DayPlan[];
  onRegenerateWeek?: () => void;
  onGenerateGroceryList?: () => void;
}

export function WeeklyPlanner({ weekData, onRegenerateWeek, onGenerateGroceryList }: WeeklyPlannerProps) {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  const mealTypeColors = {
    breakfast: 'bg-[#E9C46A]/20 text-[#8A6A4F] border-[#E9C46A]',
    lunch: 'bg-primary/20 text-primary border-primary',
    dinner: 'bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261]',
    snack: 'bg-secondary text-primary border-primary/20',
  };

  const mealTypeIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Weekly AI Meal Planner</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRegenerateWeek}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate Week
          </Button>
          <Button onClick={onGenerateGroceryList} className="bg-primary">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Grocery List
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
                  <h3 className="font-semibold">{day.day}</h3>
                  <p className="text-sm text-muted-foreground">{day.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Calories</p>
                  <p className="font-semibold">
                    {day.meals.reduce((sum, meal) => sum + meal.calories, 0)} kcal
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {day.meals.map((meal) => (
                <div
                  key={meal.id}
                  className={`rounded-lg border p-3 transition-all hover:shadow-md ${
                    mealTypeColors[meal.type]
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{mealTypeIcons[meal.type]}</span>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium uppercase opacity-70">
                        {meal.type}
                      </p>
                      <p className="font-medium leading-tight line-clamp-2">{meal.name}</p>
                      <p className="text-sm opacity-70">{meal.calories} kcal</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}