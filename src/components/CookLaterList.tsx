'use client';

import Link from 'next/link';
import { useCookLater } from '@/contexts/CookLaterContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Users,
  Trash2,
  CheckCircle2,
  ChefHat,
  Loader2,
} from 'lucide-react';
import { formatDate } from '@/lib/date-locale';
import { bi } from '@/lib/bilingual';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { recipeStatusStyles, recipeStatusLabelKeys } from '@/lib/recipe-status';

export function CookLaterList() {
  const { savedRecipes, isLoading, unsaveRecipe, markAsCooked } = useCookLater();
  const { t, language } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (savedRecipes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-secondary/30 p-12 text-center">
        <div className="mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold">{t('cookLater.empty')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('cookLater.emptyDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {savedRecipes.map((saved) => {
        const recipe = saved.recipe;
        return (
          <div
            key={saved.id}
            className={`group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md ${
              saved.isCooked ? 'opacity-60' : ''
            }`}
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              {/* Thumbnail */}
              <Link
                href={`/recipes/${recipe.id}`}
                className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-32 sm:w-48"
              >
                <ImageWithFallback
                  src={recipe.imageUrl || ''}
                  alt={bi(recipe.title, recipe.titleFr, language)}
                  className="h-full w-full object-cover"
                />
                {saved.isCooked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg">
                      <Link href={`/recipes/${recipe.id}`} className="hover:underline">
                        {bi(recipe.title, recipe.titleFr, language)}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {recipe.category === 'SafariTaste' && (
                        <Badge variant="outline" className="border-[#8A6A4F] text-[#8A6A4F]">
                          SafariTaste
                        </Badge>
                      )}
                      {recipe.status !== 'published' && recipeStatusStyles[recipe.status] && (
                        <Badge className={recipeStatusStyles[recipe.status]}>
                          {t(recipeStatusLabelKeys[recipe.status] || '') || recipe.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {recipe.prepTimeMin != null && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {recipe.prepTimeMin} {t('common.min')}
                      </div>
                    )}
                    {recipe.servings != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {recipe.servings} {t('common.servings')}
                      </div>
                    )}
                    {recipe.calories != null && (
                      <span className="font-medium text-foreground">
                        {recipe.calories} {t('common.cal')}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {t('cookLater.addedOn')}{' '}
                      {formatDate(saved.createdAt, 'PPP', language)}
                    </div>
                  </div>

                  {saved.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {saved.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="w-fit">
                          {t(`tag.${tag}`)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {recipe.ingredients.length > 0 && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {recipe.ingredients
                        .slice(0, 3)
                        .map((i) => i.text)
                        .join(', ')}
                      {recipe.ingredients.length > 3 && '...'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/recipes/${recipe.id}`}>{t('recipes.viewRecipe')}</Link>
                  </Button>
                  <Button
                    variant={saved.isCooked ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => markAsCooked(saved.id, !saved.isCooked)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {saved.isCooked ? t('cookLater.cooked') : t('cookLater.markCooked')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unsaveRecipe(saved.recipeId)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('cookLater.remove')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
