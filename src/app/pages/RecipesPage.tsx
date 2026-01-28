import { useState } from 'react';
import { RecipeCard, Recipe } from '@/app/components/RecipeCard';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Search, SlidersHorizontal, Sparkles, Download } from 'lucide-react';
import { ImportRecipeDialog } from '@/app/components/ImportRecipeDialog';
import { useLanguage } from '@/contexts/LanguageContext';

export function RecipesPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showSafariTasteOnly, setShowSafariTasteOnly] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const goals = [
    { id: 'balanced', label: 'Balanced', icon: '⚖️' },
    { id: 'high-protein', label: 'High Protein', icon: '💪' },
    { id: 'light', label: 'Light', icon: '🌿' },
    { id: 'energy-boost', label: 'Energy Boost', icon: '⚡' },
  ];

  // Mock recipe data with Unsplash images
  const recipes: Recipe[] = [
    {
      id: '1',
      title: 'Grilled Chicken Quinoa Bowl',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop',
      prepTime: '25 min',
      servings: 2,
      category: 'SafariTaste',
      goal: 'balanced',
      aiRecommended: true,
      calories: 520,
    },
    {
      id: '2',
      title: 'Mediterranean Chickpea Salad',
      image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&h=400&fit=crop',
      prepTime: '15 min',
      servings: 4,
      category: 'SafariTaste',
      goal: 'light',
      aiRecommended: true,
      calories: 350,
    },
    {
      id: '3',
      title: 'Salmon with Roasted Vegetables',
      image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&h=400&fit=crop',
      prepTime: '35 min',
      servings: 2,
      category: 'Regular',
      goal: 'high-protein',
      calories: 480,
    },
    {
      id: '4',
      title: 'Power Smoothie Bowl',
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop',
      prepTime: '10 min',
      servings: 1,
      category: 'SafariTaste',
      goal: 'energy-boost',
      aiRecommended: true,
      calories: 320,
    },
    {
      id: '5',
      title: 'Stir-Fried Tofu with Brown Rice',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
      prepTime: '30 min',
      servings: 3,
      category: 'SafariTaste',
      goal: 'balanced',
      calories: 450,
    },
    {
      id: '6',
      title: 'Greek Yogurt Parfait',
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=400&fit=crop',
      prepTime: '5 min',
      servings: 1,
      category: 'Regular',
      goal: 'high-protein',
      aiRecommended: true,
      calories: 280,
    },
    {
      id: '7',
      title: 'Lentil Curry with Naan',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop',
      prepTime: '45 min',
      servings: 4,
      category: 'SafariTaste',
      goal: 'balanced',
      calories: 520,
    },
    {
      id: '8',
      title: 'Avocado Toast with Eggs',
      image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=400&fit=crop',
      prepTime: '12 min',
      servings: 2,
      category: 'Regular',
      goal: 'energy-boost',
      calories: 380,
    },
  ];

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGoal = !selectedGoal || recipe.goal === selectedGoal;
    const matchesSafariTaste = !showSafariTasteOnly || recipe.category === 'SafariTaste';
    return matchesSearch && matchesGoal && matchesSafariTaste;
  });

  const handleViewRecipe = (recipe: Recipe) => {
    console.log('Viewing recipe:', recipe);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-[#8A6A4F] text-[#8A6A4F]">
              SafariTaste by SmartPlate
            </Badge>
          </div>
          <Button onClick={() => setImportDialogOpen(true)} className="bg-primary w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('import.button')}</span>
            <span className="sm:hidden">Import</span>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t('recipes.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('recipes.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('recipes.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input-background"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowSafariTasteOnly(!showSafariTasteOnly)}
            className={showSafariTasteOnly ? 'border-[#8A6A4F] bg-[#8A6A4F]/10' : ''}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {t('recipes.safariTasteOnly')}
          </Button>
        </div>

        {/* Goal Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedGoal === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedGoal(null)}
            className={selectedGoal === null ? 'bg-primary' : ''}
          >
            {t('recipes.allGoals')}
          </Button>
          {goals.map((goal) => (
            <Button
              key={goal.id}
              variant={selectedGoal === goal.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGoal(goal.id)}
              className={selectedGoal === goal.id ? 'bg-primary' : ''}
            >
              <span className="mr-1.5">{goal.icon}</span>
              {goal.label}
            </Button>
          ))}
        </div>
      </div>

      {/* AI Recommended Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('recipes.aiRecommended')}</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRecipes
            .filter((recipe) => recipe.aiRecommended)
            .map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onViewRecipe={handleViewRecipe}
              />
            ))}
        </div>
      </div>

      {/* All Recipes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {t('recipes.allRecipes')} ({filteredRecipes.length})
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onViewRecipe={handleViewRecipe}
            />
          ))}
        </div>
      </div>

      {filteredRecipes.length === 0 && (
        <div className="rounded-xl border border-dashed bg-secondary/30 p-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold">{t('recipes.noResults')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('recipes.noResultsDesc')}
            </p>
          </div>
        </div>
      )}

      <ImportRecipeDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}