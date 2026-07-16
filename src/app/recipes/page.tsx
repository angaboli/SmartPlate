'use client';

import { useState } from 'react';
import { RecipeCard } from '@/components/RecipeCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, Sparkles, Download } from 'lucide-react';
import { RecipeGridSkeleton } from '@/components/skeletons';
import { ImportRecipeDialog } from '@/components/ImportRecipeDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecipes } from '@/hooks/useRecipes';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function RecipesPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showSafariTasteOnly, setShowSafariTasteOnly] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filters = {
    search: searchQuery || undefined,
    goal: selectedGoal || undefined,
    category: showSafariTasteOnly ? 'SafariTaste' : undefined,
  };

  const { data, isLoading, error } = useRecipes(filters, page);
  const recipes = data?.data ?? [];
  const meta = data?.meta;

  function updateFilters(update: () => void) {
    update();
    setPage(1);
  }

  const goals = [
    { id: 'balanced', label: t('recipes.goal.balanced'), icon: '⚖️' },
    { id: 'high-protein', label: t('recipes.goal.highProtein'), icon: '💪' },
    { id: 'light', label: t('recipes.goal.light'), icon: '🌿' },
    { id: 'energy-boost', label: t('recipes.goal.energyBoost'), icon: '⚡' },
  ];

  return (
    <div className="min-h-screen space-y-8 pb-20">
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
              onChange={(e) => updateFilters(() => setSearchQuery(e.target.value))}
              className="pl-10 bg-input-background"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => updateFilters(() => setShowSafariTasteOnly(!showSafariTasteOnly))}
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
            onClick={() => updateFilters(() => setSelectedGoal(null))}
            className={selectedGoal === null ? 'bg-primary' : ''}
          >
            {t('recipes.allGoals')}
          </Button>
          {goals.map((goal) => (
            <Button
              key={goal.id}
              variant={selectedGoal === goal.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters(() => setSelectedGoal(goal.id))}
              className={selectedGoal === goal.id ? 'bg-primary' : ''}
            >
              <span className="mr-1.5">{goal.icon}</span>
              {goal.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <RecipeGridSkeleton count={8} />}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive">{t('recipes.failedLoad')}</p>
        </div>
      )}

      {/* Recipes Content */}
      {!isLoading && !error && (
        <>
          {/* AI Recommended Section */}
          {recipes.some((r) => r.aiRecommended) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{t('recipes.aiRecommended')}</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recipes
                  .filter((recipe) => recipe.aiRecommended)
                  .map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}

                    />
                  ))}
              </div>
            </div>
          )}

          {/* All Recipes */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {t('recipes.allRecipes')} ({meta?.total ?? recipes.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                />
              ))}
            </div>
          </div>

          {meta && meta.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page <= 1}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                  />
                </PaginationItem>
                {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === page}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={page >= meta.totalPages}
                    className={page >= meta.totalPages ? 'pointer-events-none opacity-50' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < meta.totalPages) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}

          {recipes.length === 0 && (
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
        </>
      )}

      <ImportRecipeDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}
