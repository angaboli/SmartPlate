'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRecipe } from '@/hooks/useRecipes';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Clock,
  Users,
  Flame,
  Sparkles,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { useCookLater } from '@/contexts/CookLaterContext';

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

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: recipe, isLoading, error } = useRecipe(id);
  const { isRecipeSaved, saveRecipe, unsaveRecipe, isSaving } = useCookLater();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">Recipe not found.</p>
        <Button variant="outline" asChild>
          <Link href="/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to recipes
          </Link>
        </Button>
      </div>
    );
  }

  const saved = isRecipeSaved(recipe.id);
  const totalTime =
    (recipe.prepTimeMin ?? 0) + (recipe.cookTimeMin ?? 0) || null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-20">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/recipes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to recipes
        </Link>
      </Button>

      {/* Hero image */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary">
        <ImageWithFallback
          src={recipe.imageUrl || ''}
          alt={recipe.title}
          className="h-full w-full object-cover"
        />
        {recipe.aiRecommended && (
          <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="mr-1 h-3 w-3" />
            AI Recommended
          </Badge>
        )}
      </div>

      {/* Title + badges */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
        <div className="flex flex-wrap gap-2">
          {recipe.category === 'SafariTaste' && (
            <Badge variant="outline" className="border-[#8A6A4F] text-[#8A6A4F]">
              SafariTaste
            </Badge>
          )}
          {recipe.goal && goalColors[recipe.goal] && (
            <Badge variant="outline" className={goalColors[recipe.goal]}>
              {goalLabels[recipe.goal] || recipe.goal}
            </Badge>
          )}
        </div>
        {recipe.description && (
          <p className="text-muted-foreground leading-relaxed">
            {recipe.description}
          </p>
        )}
      </div>

      {/* Metadata bar */}
      <div className="flex flex-wrap gap-6 rounded-xl border bg-card p-4">
        {recipe.prepTimeMin != null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Prep</p>
              <p className="font-medium">{recipe.prepTimeMin} min</p>
            </div>
          </div>
        )}
        {recipe.cookTimeMin != null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Cook</p>
              <p className="font-medium">{recipe.cookTimeMin} min</p>
            </div>
          </div>
        )}
        {totalTime != null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-medium">{totalTime} min</p>
            </div>
          </div>
        )}
        {recipe.servings != null && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Servings</p>
              <p className="font-medium">{recipe.servings}</p>
            </div>
          </div>
        )}
        {recipe.calories != null && (
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Calories</p>
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
        {saved ? 'Saved to Cook Later' : 'Save for Later'}
      </Button>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing) => (
              <li
                key={ing.id}
                className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm"
              >
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                {ing.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Instructions</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={step.id} className="flex gap-4 rounded-lg border bg-card px-4 py-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-0.5">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Source info for imported recipes */}
      {recipe.isImported && recipe.sourceUrl && (
        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            Imported from{' '}
            {recipe.sourceProvider && (
              <span className="font-medium">{recipe.sourceProvider} — </span>
            )}
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              View original
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
