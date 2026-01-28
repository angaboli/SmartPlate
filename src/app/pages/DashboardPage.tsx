import { useState } from 'react';
import { MealInput } from '@/app/components/MealInput';
import { AIAnalysisCard } from '@/app/components/AIAnalysisCard';
import { SmartSuggestions } from '@/app/components/SmartSuggestions';
import { WeeklyPlanner } from '@/app/components/WeeklyPlanner';
import { GroceryListDialog } from '@/app/components/GroceryListDialog';
import { WeeklyProgressChart } from '@/app/components/WeeklyProgressChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Progress } from '@/app/components/ui/progress';
import { Badge } from '@/app/components/ui/badge';
import { TrendingUp, Target, Calendar } from 'lucide-react';

export function DashboardPage() {
  const [analyzed, setAnalyzed] = useState(false);
  const [groceryListOpen, setGroceryListOpen] = useState(false);

  // Mock data
  const analysisData = {
    balance: 'good' as const,
    nutrients: [
      { name: 'Protein', value: 45, target: 60, unit: 'g' },
      { name: 'Carbohydrates', value: 180, target: 200, unit: 'g' },
      { name: 'Fats', value: 50, target: 70, unit: 'g' },
      { name: 'Fiber', value: 18, target: 25, unit: 'g' },
    ],
    missing: [
      'More vegetables for better fiber intake',
      'Omega-3 fatty acids from fish or seeds',
      'Vitamin D sources like fortified foods',
    ],
    overconsumption: [
      'Refined carbohydrates - consider whole grains',
      'Sodium levels slightly elevated',
    ],
  };

  const suggestions = [
    {
      type: 'improve' as const,
      title: 'Add more vegetables',
      description: 'Include 2 cups of leafy greens for better nutrient balance',
    },
    {
      type: 'swap' as const,
      title: 'Swap refined carbs',
      description: 'Replace white rice with quinoa or brown rice',
    },
    {
      type: 'add' as const,
      title: 'Include healthy fats',
      description: 'Add avocado or nuts for omega-3 fatty acids',
    },
    {
      type: 'improve' as const,
      title: 'Increase protein',
      description: 'Add 15g more protein through lean meat or legumes',
    },
  ];

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
    console.log('Analyzing meal:', meal, mealType);
    setAnalyzed(true);
  };

  const handleRegenerateWeek = () => {
    console.log('Regenerating weekly plan');
  };

  const handleGenerateGroceryList = () => {
    setGroceryListOpen(true);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Daily Goal</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">1,850</span>
                <span className="text-sm text-muted-foreground">/ 2,000 kcal</span>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Target className="h-5 w-5 text-primary" />
            </div>
          </div>
          <Progress value={92.5} className="mt-4" />
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Weekly Progress</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">5</span>
                <span className="text-sm text-muted-foreground">/ 7 days</span>
              </div>
            </div>
            <div className="rounded-lg bg-[#E9C46A]/20 p-3">
              <Calendar className="h-5 w-5 text-[#8A6A4F]" />
            </div>
          </div>
          <Progress value={71.4} className="mt-4" />
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">This Week</p>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">+12%</span>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Excellent
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Great choice — here's how to improve it.
          </p>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="analyze" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analyze">AI Meal Analysis</TabsTrigger>
          <TabsTrigger value="planner">Weekly Planner</TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-8">
          {/* Meal Input */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Track Your Meal</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter what you ate and get instant AI-powered nutrition insights
              </p>
            </div>
            <MealInput onAnalyze={handleAnalyze} />
          </div>

          {/* AI Analysis */}
          {analyzed && (
            <>
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">AI Analysis</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your meal composition looks good. Keep up the good work!
                  </p>
                </div>
                <AIAnalysisCard data={analysisData} />
              </div>

              {/* Smart Suggestions */}
              <SmartSuggestions suggestions={suggestions} />
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

      {/* Grocery List Dialog */}
      <GroceryListDialog
        open={groceryListOpen}
        onOpenChange={setGroceryListOpen}
      />
    </div>
  );
}