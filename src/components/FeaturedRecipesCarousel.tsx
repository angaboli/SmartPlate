'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { RecipeCard } from '@/components/RecipeCard';
import { useRecipes } from '@/hooks/useRecipes';
import { useLanguage } from '@/contexts/LanguageContext';

// Editorial curation only — recipes an editor/admin explicitly marked
// `featured` via src/app/dashboard/recipes/manage/page.tsx, ordered by
// `featuredOrder` (see setRecipeFeatured in recipes.service.ts). Renders
// nothing while loading or when there's no curated selection, so the
// homepage never shows an empty or broken-looking section.
export function FeaturedRecipesCarousel() {
  const { t } = useLanguage();
  const { data, isLoading } = useRecipes({ featured: true }, 1, 8);
  const recipes = data?.data ?? [];

  if (isLoading || recipes.length === 0) return null;

  return (
    <section className="container px-4 md:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t('home.featuredTitle')}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('home.featuredSubtitle')}
        </p>
      </div>

      <Carousel opts={{ align: 'start' }} className="px-10">
        <CarouselContent>
          {recipes.map((recipe) => (
            <CarouselItem key={recipe.id} className="sm:basis-1/2 lg:basis-1/3">
              <RecipeCard recipe={recipe} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}
