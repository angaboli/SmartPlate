'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRecipe, useSubmitForReview } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { DeleteRecipeDialog } from '@/components/DeleteRecipeDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Clock,
  Users,
  Flame,
  Sparkles,
  Bookmark,
  Pencil,
  Send,
} from 'lucide-react';
import { RecipeDetailSkeleton } from '@/components/skeletons';
import { useCookLater } from '@/contexts/CookLaterContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { bi } from '@/lib/bilingual';
import { toast } from 'sonner';

const goalColors: Record<string, string> = {
  balanced: 'bg-primary/10 text-primary border-primary/20',
  'high-protein': 'bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/20',
  light: 'bg-[#E8F4F1] text-primary border-primary/20',
  'energy-boost': 'bg-[#E9C46A]/10 text-[#8A6A4F] border-[#8A6A4F]/20',
};

const goalLabelKeys: Record<string, string> = {
  balanced: 'recipes.goal.balanced',
  'high-protein': 'recipes.goal.highProtein',
  light: 'recipes.goal.light',
  'energy-boost': 'recipes.goal.energyBoost',
};

const statusBadge: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  published:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabelKeys: Record<string, string> = {
  draft: 'recipes.status.draft',
  pending_review: 'recipes.status.pendingReview',
  published: 'recipes.status.published',
  rejected: 'recipes.status.rejected',
};

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: recipe, isLoading, error } = useRecipe(id);
  const { user } = useAuth();
  const { isRecipeSaved, saveRecipe, unsaveRecipe, isSaving } = useCookLater();
  const { t, language } = useLanguage();
  const submitForReview = useSubmitForReview();

  if (isLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (error || !recipe) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">{t('recipes.notFound')}</p>
        <Button variant="outline" asChild>
          <Link href="/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('recipes.backToRecipes')}
          </Link>
        </Button>
      </div>
    );
  }

  const saved = isRecipeSaved(recipe.id);
  const totalTime =
    (recipe.prepTimeMin ?? 0) + (recipe.cookTimeMin ?? 0) || null;

  const isAuthor = user && recipe.authorId === user.id;
  const isAdmin = user?.role === 'admin';
  const canEdit = isAuthor || isAdmin;
  const canSubmit =
    isAuthor &&
    (recipe.status === 'draft' || recipe.status === 'rejected');

  return (
    <div className="min-h-screen mx-auto max-w-3xl space-y-8 pb-20">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/recipes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('recipes.backToRecipes')}
        </Link>
      </Button>

      {/* Hero image */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary">
        <ImageWithFallback
          src={recipe.imageUrl || ''}
          alt={bi(recipe.title, recipe.titleFr, language)}
          className="h-full w-full object-cover"
        />
        {recipe.aiRecommended && (
          <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="mr-1 h-3 w-3" />
            {t('recipes.aiRecommended')}
          </Badge>
        )}
      </div>

      {/* Title + badges */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{bi(recipe.title, recipe.titleFr, language)}</h1>
        <div className="flex flex-wrap gap-2">
          {recipe.status !== 'published' && (
            <Badge className={statusBadge[recipe.status] || ''}>
              {t(statusLabelKeys[recipe.status] || '') || recipe.status}
            </Badge>
          )}
          {recipe.category === 'SafariTaste' && (
            <Badge variant="outline" className="border-[#8A6A4F] text-[#8A6A4F]">
              SafariTaste
            </Badge>
          )}
          {recipe.goal && goalColors[recipe.goal] && (
            <Badge variant="outline" className={goalColors[recipe.goal]}>
              {t(goalLabelKeys[recipe.goal] || '') || recipe.goal}
            </Badge>
          )}
        </div>
        {(recipe.description || recipe.descriptionFr) && (
          <p className="text-muted-foreground leading-relaxed">
            {bi(recipe.description, recipe.descriptionFr, language)}
          </p>
        )}
        {recipe.reviewNote && recipe.status === 'rejected' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
            <strong>{t('recipes.reviewNote')}</strong> {recipe.reviewNote}
          </div>
        )}
      </div>

      {/* Author action buttons */}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/recipes/${recipe.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Link>
          </Button>
          <DeleteRecipeDialog
            recipeId={recipe.id}
            recipeTitle={recipe.title}
          />
          {canSubmit && (
            <Button
              variant="outline"
              onClick={() =>
                submitForReview.mutate(recipe.id, {
                  onSuccess: () => toast.success(t('recipes.submittedReview')),
                  onError: (err) => toast.error(err.message),
                })
              }
              disabled={submitForReview.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {submitForReview.isPending ? t('recipes.submitting') : t('recipes.submitForReview')}
            </Button>
          )}
        </div>
      )}

      {/* Metadata bar */}
      <div className="flex flex-wrap gap-6 rounded-xl border bg-card p-4">
        {recipe.prepTimeMin != null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('recipes.prep')}</p>
              <p className="font-medium">{recipe.prepTimeMin} {t('common.min')}</p>
            </div>
          </div>
        )}
        {recipe.cookTimeMin != null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('recipes.cook')}</p>
              <p className="font-medium">{recipe.cookTimeMin} {t('common.min')}</p>
            </div>
          </div>
        )}
        {totalTime != null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('recipes.total')}</p>
              <p className="font-medium">{totalTime} {t('common.min')}</p>
            </div>
          </div>
        )}
        {recipe.servings != null && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('recipeForm.servings')}</p>
              <p className="font-medium">{recipe.servings}</p>
            </div>
          </div>
        )}
        {recipe.calories != null && (
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('recipeForm.calories')}</p>
              <p className="font-medium">{recipe.calories} kcal</p>
            </div>
          </div>
        )}
      </div>

      {/* Cook Later button */}
      <Button
        variant={saved ? 'default' : 'outline'}
        className="w-full"
        onClick={() => (saved ? unsaveRecipe(recipe.id) : saveRecipe(recipe.id))}
        disabled={isSaving}
      >
        <Bookmark
          className={`mr-2 h-4 w-4 ${saved ? 'fill-current' : ''}`}
        />
        {saved ? t('recipes.savedCookLater') : t('recipes.saveForLater')}
      </Button>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t('recipes.ingredients')}</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing) => (
              <li
                key={ing.id}
                className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
              >
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                {bi(ing.text, ing.textFr, language)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t('recipes.instructions')}</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={step.id} className="flex gap-4 rounded-lg border bg-card px-4 py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-0.5">{bi(step.text, step.textFr, language)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Source info for imported recipes */}
      {recipe.isImported && recipe.sourceUrl && (
        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            {t('recipes.importedFrom')}{' '}
            {recipe.sourceProvider && (
              <span className="font-medium">{recipe.sourceProvider} — </span>
            )}
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {t('recipes.viewOriginal')}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
