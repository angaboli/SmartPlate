'use client';

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
import { format } from 'date-fns';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

export function CookLaterList() {
  const { savedRecipes, isLoading, unsaveRecipe, markAsCooked } = useCookLater();
  const { t } = useLanguage();

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
              <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-32 sm:w-48">
                <ImageWithFallback
                  src={recipe.imageUrl || ''}
                  alt={recipe.title}
                  className="h-full w-full object-cover"
                />
                {saved.isCooked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg">{recipe.title}</h3>
                    {recipe.category === 'SafariTaste' && (
                      <Badge variant="outline" className="border-[#8A6A4F] text-[#8A6A4F]">
                        SafariTaste
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {recipe.prepTimeMin != null && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {recipe.prepTimeMin} min
                      </div>
                    )}
                    {recipe.servings != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {recipe.servings} servings
                      </div>
                    )}
                    {recipe.calories != null && (
                      <span className="font-medium text-foreground">
                        {recipe.calories} cal
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {t('cookLater.addedOn')}{' '}
                      {format(new Date(saved.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>

                  {saved.tag && (
                    <Badge variant="secondary" className="w-fit">
                      {t(`tag.${saved.tag}`)}
                    </Badge>
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
                  <Button
                    variant={saved.isCooked ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => markAsCooked(saved.id, !saved.isCooked)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {saved.isCooked ? 'Cooked' : t('cookLater.markCooked')}
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
