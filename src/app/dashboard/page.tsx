'use client';

import { useState } from 'react';
import { MealInput } from '@/components/MealInput';
import { AIAnalysisCard } from '@/components/AIAnalysisCard';
import { SmartSuggestions } from '@/components/SmartSuggestions';
import { WeeklyPlanner } from '@/components/WeeklyPlanner';
import { GroceryListDialog } from '@/components/GroceryListDialog';
import { AddEditMealDialog } from '@/components/AddEditMealDialog';
import { WeeklyProgressChart } from '@/components/WeeklyProgressChart';
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
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const nf = new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US');

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
          toast.error(error.message || t('dashboard.failedAnalyze'));
        },
      },
    );
  };

  const handleGeneratePlan = () => {
    generatePlanMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('dashboard.planGenerated'));
      },
      onError: (error) => {
        toast.error(error.message || t('dashboard.failedGenerate'));
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
        toast.success(t('dashboard.mealRemoved'));
      },
      onError: (error) => {
        toast.error(error.message || t('dashboard.failedDelete'));
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
            toast.success(t('dashboard.mealUpdated'));
          },
          onError: (error) => {
            toast.error(error.message || t('dashboard.failedUpdate'));
          },
        },
      );
    } else {
      addMealMutation.mutate(data, {
        onSuccess: () => {
          setAddMealDialogOpen(false);
          toast.success(t('dashboard.mealAdded'));
        },
        onError: (error) => {
          toast.error(error.message || t('dashboard.failedAdd'));
        },
      });
    }
  };

  const handleOptimizePlan = () => {
    adjustPlanMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('dashboard.planOptimized'));
      },
      onError: (error) => {
        toast.error(error.message || t('dashboard.failedOptimize'));
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
              <p className="text-sm text-muted-foreground">{t('dashboard.dailyGoal')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{nf.format(todayCalories)}</span>
                <span className="text-sm text-muted-foreground">/ {nf.format(calorieTarget)} kcal</span>
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
              <p className="text-sm text-muted-foreground">{t('dashboard.weeklyProgress')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{weekDaysLogged}</span>
                <span className="text-sm text-muted-foreground">{'/ 7 ' + t('dashboard.days')}</span>
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
              <p className="text-sm text-muted-foreground">{t('dashboard.thisWeek')}</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {(summary?.today.mealCount ?? 0) + ' ' + t('dashboard.meals')}
                </span>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {weekDaysLogged >= 5 ? t('dashboard.excellent') : weekDaysLogged >= 3 ? t('dashboard.good') : t('dashboard.gettingStarted')}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {weekDaysLogged >= 5
              ? t('dashboard.greatConsistency')
              : t('dashboard.logMore')}
          </p>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <WeeklyProgressChart data={summary?.weeklyData} />

      {/* Welcome Guide */}
      <section className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-semibold">{t('dashboard.welcomeTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.welcomeDesc')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs border">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              {t('dashboard.step1')}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs border">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              {t('dashboard.step2')}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs border">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              {t('dashboard.step3')}
            </div>
          </div>
        </div>
      </section>

      {/* AI Meal Analysis Section */}
      <section className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{t('dashboard.trackMeal')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('dashboard.trackMealDesc')}
            </p>
          </div>
          <MealInput onAnalyze={handleAnalyze} loading={analyzeMutation.isPending} />
        </div>

        {analyzed && latestLog && (
          <>
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{t('dashboard.aiAnalysis')}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('dashboard.analysisFor')} {latestLog.mealText.length > 80
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
      </section>

      {/* Weekly Planner Section */}
      <section className="space-y-6">
        {planLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('dashboard.loadingPlan')}</p>
          </div>
        )}

        {!planLoading && weekData.length === 0 && (
          <div className="rounded-xl border border-dashed bg-secondary/30 p-12 text-center">
            <div className="mx-auto max-w-md space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold">{t('dashboard.noPlan')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.noPlanDesc')}
              </p>
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={generatePlanMutation.isPending}
                >
                  {generatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('dashboard.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('dashboard.generateAI')}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAddMeal(0)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.createManually')}
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
      </section>

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
