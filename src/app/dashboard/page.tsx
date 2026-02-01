'use client';

import { useState } from 'react';
import { MealInput } from '@/components/MealInput';
import { AIAnalysisCard } from '@/components/AIAnalysisCard';
import { SmartSuggestions } from '@/components/SmartSuggestions';
import { WeeklyPlanner } from '@/components/WeeklyPlanner';
import { GroceryListDialog } from '@/components/GroceryListDialog';
import { WeeklyProgressChart } from '@/components/WeeklyProgressChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAnalyzeMeal,
  useDailySummary,
  type MealLogDTO,
} from '@/hooks/useMealLog';

export default function DashboardPage() {
  const [latestLog, setLatestLog] = useState<MealLogDTO | null>(null);
  const [groceryListOpen, setGroceryListOpen] = useState(false);

  const analyzeMutation = useAnalyzeMeal();
  const { data: summary } = useDailySummary();

  // Stats from live summary
  const todayCalories = summary?.today.totalCalories ?? 0;
  const calorieTarget = summary?.today.calorieTarget ?? 2000;
  const weekDaysLogged = summary?.weekDaysLogged ?? 0;
  const calorieProgress = calorieTarget > 0 ? Math.min((todayCalories / calorieTarget) * 100, 100) : 0;
  const weekProgress = (weekDaysLogged / 7) * 100;

  // Weekly Planner mock data (stays mocked for M7)
  const weekData = [
    {
      date: 'Jan 23, 2026',
      day: 'Monday',
      meals: [
        { id: '1', name: 'Oatmeal with berries and almonds', calories: 350, type: 'breakfast' as const },
        { id: '2', name: 'Grilled chicken quinoa bowl', calories: 520, type: 'lunch' as const },
        { id: '3', name: 'Salmon with roasted vegetables', calories: 480, type: 'dinner' as const },
        { id: '4', name: 'Greek yogurt with honey', calories: 150, type: 'snack' as const },
      ],
    },
    {
      date: 'Jan 24, 2026',
      day: 'Tuesday',
      meals: [
        { id: '5', name: 'Scrambled eggs with avocado toast', calories: 380, type: 'breakfast' as const },
        { id: '6', name: 'Mediterranean chickpea salad', calories: 450, type: 'lunch' as const },
        { id: '7', name: 'Stir-fried tofu with brown rice', calories: 500, type: 'dinner' as const },
        { id: '8', name: 'Apple with almond butter', calories: 180, type: 'snack' as const },
      ],
    },
    {
      date: 'Jan 25, 2026',
      day: 'Wednesday',
      meals: [
        { id: '9', name: 'Smoothie bowl with granola', calories: 320, type: 'breakfast' as const },
        { id: '10', name: 'Turkey wrap with hummus', calories: 480, type: 'lunch' as const },
        { id: '11', name: 'Grilled fish with sweet potato', calories: 520, type: 'dinner' as const },
        { id: '12', name: 'Mixed nuts', calories: 170, type: 'snack' as const },
      ],
    },
  ];

  const handleAnalyze = (meal: string, mealType: string) => {
    analyzeMutation.mutate(
      { mealText: meal, mealType },
      {
        onSuccess: (data) => {
          setLatestLog(data);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to analyze meal');
        },
      },
    );
  };

  const handleRegenerateWeek = () => {
    console.log('Regenerating weekly plan');
  };

  const handleGenerateGroceryList = () => {
    setGroceryListOpen(true);
  };

  const analyzed = latestLog !== null;

  return (
    <div className="space-y-8 pb-20">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Daily Goal</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{todayCalories.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/ {calorieTarget.toLocaleString()} kcal</span>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Target className="h-5 w-5 text-primary" />
            </div>
          </div>
          <Progress value={calorieProgress} className="mt-4" />
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Weekly Progress</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{weekDaysLogged}</span>
                <span className="text-sm text-muted-foreground">/ 7 days</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#E9C46A]/20 p-3">
              <Calendar className="h-5 w-5 text-[#8A6A4F]" />
            </div>
          </div>
          <Progress value={weekProgress} className="mt-4" />
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">This Week</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {summary?.today.mealCount ?? 0} meals
                </span>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {weekDaysLogged >= 5 ? 'Excellent' : weekDaysLogged >= 3 ? 'Good' : 'Getting started'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {weekDaysLogged >= 5
              ? 'Great consistency this week!'
              : 'Log more meals to track your progress.'}
          </p>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <WeeklyProgressChart data={summary?.weeklyData} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analyze">AI Meal Analysis</TabsTrigger>
          <TabsTrigger value="planner">Weekly Planner</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-8">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Track Your Meal</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter what you ate and get instant AI-powered nutrition insights
              </p>
            </div>
            <MealInput onAnalyze={handleAnalyze} loading={analyzeMutation.isPending} />
          </div>

          {analyzed && latestLog && (
            <>
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">AI Analysis</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Analysis for: {latestLog.mealText.length > 80
                      ? latestLog.mealText.slice(0, 80) + '...'
                      : latestLog.mealText}
                    {' '}({latestLog.totalCalories} kcal)
                  </p>
                </div>
                <AIAnalysisCard data={latestLog.analysis.analysisData} />
              </div>
              <SmartSuggestions suggestions={latestLog.analysis.suggestions} />
            </>
          )}

          {!analyzed && (
            <div className="rounded-xl border border-dashed bg-secondary/30 p-12 text-center">
              <div className="mx-auto max-w-md space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">No meal analyzed yet</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your meal above to get AI-powered nutrition insights and personalized suggestions
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="planner" className="space-y-6">
          <WeeklyPlanner
            weekData={weekData}
            onRegenerateWeek={handleRegenerateWeek}
            onGenerateGroceryList={handleGenerateGroceryList}
          />
        </TabsContent>
      </Tabs>

      <GroceryListDialog
        open={groceryListOpen}
        onOpenChange={setGroceryListOpen}
      />
    </div>
  );
}
