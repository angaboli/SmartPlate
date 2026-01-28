import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Clock, Users, Sparkles } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

export interface Recipe {
  id: string;
  title: string;
  image: string;
  prepTime: string;
  servings: number;
  category: string;
  goal?: 'balanced' | 'high-protein' | 'light' | 'energy-boost';
  aiRecommended?: boolean;
  calories?: number;
}

interface RecipeCardProps {
  recipe: Recipe;
  onViewRecipe?: (recipe: Recipe) => void;
}

export function RecipeCard({ recipe, onViewRecipe }: RecipeCardProps) {
  const goalColors = {
    balanced: 'bg-primary/10 text-primary border-primary/20',
    'high-protein': 'bg-[#F4A261]/10 text-[#F4A261] border-[#F4A261]/20',
    light: 'bg-[#E8F4F1] text-primary border-primary/20',
    'energy-boost': 'bg-[#E9C46A]/10 text-[#8A6A4F] border-[#8A6A4F]/20',
  };

  const goalLabels = {
    balanced: 'Balanced',
    'high-protein': 'High Protein',
    light: 'Light',
    'energy-boost': 'Energy Boost',
  };

  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-lg">
      <div className="relative aspect-video overflow-hidden bg-secondary">
        <ImageWithFallback
          src={recipe.image}
          alt={recipe.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {recipe.aiRecommended && (
          <div className="absolute right-3 top-3">
            <Badge className="bg-primary text-primary-foreground shadow-lg">
              <Sparkles className="mr-1 h-3 w-3" />
              AI Recommended
            </Badge>
          </div>
        )}
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
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{recipe.prepTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{recipe.servings} servings</span>
          </div>
          {recipe.calories && (
            <div className="font-medium text-foreground">
              {recipe.calories} cal
            </div>
          )}
        </div>

        {recipe.goal && (
          <Badge variant="outline" className={goalColors[recipe.goal]}>
            {goalLabels[recipe.goal]}
          </Badge>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onViewRecipe?.(recipe)}
        >
          View Recipe
        </Button>
      </div>
    </div>
  );
}
