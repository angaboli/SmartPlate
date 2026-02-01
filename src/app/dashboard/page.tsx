'use client';

import { useState } from 'react';
import { MealInput } from '@/components/MealInput';
import { AIAnalysisCard } from '@/components/AIAnalysisCard';
import { SmartSuggestions } from '@/components/SmartSuggestions';
import { WeeklyPlanner } from '@/components/WeeklyPlanner';
import { GroceryListDialog } from '@/components/GroceryListDialog';
import { AddEditMealDialog } from '@/components/AddEditMealDialog';
import { WeeklyProgressChart } from '@/components/WeeklyProgressChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Target, Calendar, Loader2, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAnalyzeMeal,
  useDailySummary,
  type MealLogDTO,
} from '@/hooks/useMealLog';
import {
  useMealPlan,
  useGeneratePlan,
  useAddMeal,
  useUpdateMeal,
  useDeleteMeal,
  useAdjustPlan,
  type Meal,
} from '@/hooks/usePlanner';

export default function DashboardPage() {
  const [latestLog, setLatestLog] = useState<MealLogDTO | null>(null);
  const [groceryListOpen, setGroceryListOpen] = useState(false);
  const [addMealDialogOpen, setAddMealDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const analyzeMutation = useAnalyzeMeal();
  const { data: summary } = useDailySummary();
  const { data: mealPlan, isLoading: planLoading } = useMealPlan();
  const generatePlanMutation = useGeneratePlan();
  const addMealMutation = useAddMeal();
  const updateMealMutation = useUpdateMeal();
  const deleteMealMutation = useDeleteMeal();
  const adjustPlanMutation = useAdjustPlan();

  // Stats from live summary
  const todayCalories = summary?.today.totalCalories ?? 0;
  const calorieTarget = summary?.today.calorieTarget ?? 2000;
  const weekDaysLogged = summary?.weekDaysLogged ?? 0;
  const calorieProgress = calorieTarget > 0 ? Math.min((todayCalories / calorieTarget) * 100, 100) : 0;
  const weekProgress = (weekDaysLogged / 7) * 100;

  const weekData = mealPlan?.weekData ?? [];
  const planId = mealPlan?.id ?? null;

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

  const handleGeneratePlan = () => {
    generatePlanMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Weekly meal plan generated!');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to generate plan');
      },
    });
  };

  const handleGenerateGroceryList = () => {
    setGroceryListOpen(true);
  };

  const handleAddMeal = (dayIndex: number) => {
    setEditingMeal(null);
    setSelectedDayIndex(dayIndex);
    setAddMealDialogOpen(true);
  };

  const handleEditMeal = (meal: Meal, dayIndex: number) => {
    setEditingMeal(meal);
    setSelectedDayIndex(dayIndex);
    setAddMealDialogOpen(true);
  };

  const handleDeleteMeal = (mealId: string) => {
    deleteMealMutation.mutate(mealId, {
      onSuccess: () => {
        toast.success('Meal removed');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete meal');
      },
    });
  };

  const handleSaveMeal = (data: {
    name: string;
    calories?: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    dayIndex: number;
  }) => {
    if (editingMeal) {
      updateMealMutation.mutate(
        {
          itemId: editingMeal.id,
          data: { name: data.name, ...(data.calories !== undefined && { calories: data.calories }), mealType: data.mealType },
        },
        {
          onSuccess: () => {
            setAddMealDialogOpen(false);
            toast.success('Meal updated');
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to update meal');
          },
        },
      );
    } else {
      addMealMutation.mutate(data, {
        onSuccess: () => {
          setAddMealDialogOpen(false);
          toast.success('Meal added');
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to add meal');
        },
      });
    }
  };

  const handleOptimizePlan = () => {
    adjustPlanMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Plan optimized with AI!');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to optimize plan');
      },
    });
  };

  const analyzed = latestLog !== null;
  const isMealSaving = addMealMutation.isPending || updateMealMutation.isPending;

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
          {planLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your meal plan...</p>
            </div>
          )}

          {!planLoading && weekData.length === 0 && (
            <div className="rounded-xl border border-dashed bg-secondary/30 p-12 text-center">
              <div className="mx-auto max-w-md space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">No meal plan yet</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a personalized weekly meal plan with AI, or start building one manually.
                </p>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <Button
                    onClick={handleGeneratePlan}
                    disabled={generatePlanMutation.isPending}
                  >
                    {generatePlanMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAddMeal(0)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manually
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!planLoading && weekData.length > 0 && (
            <WeeklyPlanner
              weekData={weekData}
              onRegenerateWeek={handleGeneratePlan}
              onGenerateGroceryList={handleGenerateGroceryList}
              isRegenerating={generatePlanMutation.isPending}
              onAddMeal={handleAddMeal}
              onEditMeal={handleEditMeal}
              onDeleteMeal={handleDeleteMeal}
              onOptimizeWithAI={handleOptimizePlan}
              isOptimizing={adjustPlanMutation.isPending}
            />
          )}
        </TabsContent>
      </Tabs>

      <GroceryListDialog
        open={groceryListOpen}
        onOpenChange={setGroceryListOpen}
        planId={planId}
      />

      <AddEditMealDialog
        open={addMealDialogOpen}
        onOpenChange={setAddMealDialogOpen}
        onSave={handleSaveMeal}
        editingMeal={editingMeal}
        defaultDayIndex={selectedDayIndex}
        isLoading={isMealSaving}
      />
    </div>
  );
}
