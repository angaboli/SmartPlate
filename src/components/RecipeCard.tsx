'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Sparkles, Bookmark } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useCookLater } from '@/contexts/CookLaterContext';

export interface Recipe {
  id: string;
  title: string;
  imageUrl: string | null;
  prepTimeMin: number | null;
  servings: number | null;
  category: string;
  goal?: string | null;
  aiRecommended?: boolean;
  calories?: number | null;
  status?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
}

const goalColors: Record<string, string> = {
  balanced: 'bg-primary/10 text-primary border-primary/20',
  'high-protein': 'bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/20',
  light: 'bg-[#E8F4F1] text-primary border-primary/20',
  'energy-boost': 'bg-[#E9C46A]/10 text-[#8A6A4F] border-[#8A6A4F]/20',
};

const goalLabels: Record<string, string> = {
  balanced: 'Balanced',
  'high-protein': 'High Protein',
  light: 'Light',
  'energy-boost': 'Energy Boost',
};

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
};

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { isRecipeSaved, saveRecipe, unsaveRecipe, isSaving } = useCookLater();
  const saved = isRecipeSaved(recipe.id);

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saved) {
      unsaveRecipe(recipe.id);
    } else {
      saveRecipe(recipe.id);
    }
  };

  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden bg-secondary">
        <ImageWithFallback
          src={recipe.imageUrl || ''}
          alt={recipe.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {recipe.aiRecommended && (
            <Badge className="bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="mr-1 h-3 w-3" />
              AI Recommended
            </Badge>
          )}
          <button
            onClick={handleToggleSave}
            disabled={isSaving}
            className="rounded-full bg-white/80 p-1.5 shadow-md backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Bookmark
              className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight line-clamp-2">{recipe.title}</h3>
          </div>

          {recipe.category === 'SafariTaste' && (
            <Badge variant="outline" className="border-[#8A6A4F] text-[#8A6A4F]">
              SafariTaste
            </Badge>
          )}
          {recipe.status && recipe.status !== 'published' && statusStyles[recipe.status] && (
            <Badge className={statusStyles[recipe.status]}>
              {statusLabels[recipe.status] || recipe.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {recipe.prepTimeMin != null && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{recipe.prepTimeMin} min</span>
            </div>
          )}
          {recipe.servings != null && (
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
          {recipe.calories != null && (
            <div className="font-medium text-foreground">
              {recipe.calories} cal
            </div>
          )}
        </div>

        {recipe.goal && goalColors[recipe.goal] && (
          <Badge variant="outline" className={goalColors[recipe.goal]}>
            {goalLabels[recipe.goal] || recipe.goal}
          </Badge>
        )}

        <Button variant="outline" className="w-full" asChild>
          <Link href={`/recipes/${recipe.id}`}>View Recipe</Link>
        </Button>
      </div>
    </div>
  );
}
