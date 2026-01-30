'use client';

import {
  useSavedRecipes,
  useSaveRecipe,
  useUnsaveRecipe,
  useUpdateSavedRecipe,
  type SavedRecipeDTO,
} from '@/hooks/useCookLater';

export type { SavedRecipeDTO };

export function useCookLater() {
  const { data: savedRecipes = [], isLoading } = useSavedRecipes();
  const saveRecipeMutation = useSaveRecipe();
  const unsaveRecipeMutation = useUnsaveRecipe();
  const updateMutation = useUpdateSavedRecipe();

  const saveRecipe = (recipeId: string, tag?: string) => {
    saveRecipeMutation.mutate({ recipeId, tag });
  };

  const unsaveRecipe = (recipeId: string) => {
    unsaveRecipeMutation.mutate(recipeId);
  };

  const markAsCooked = (savedId: string, isCooked: boolean) => {
    updateMutation.mutate({ savedId, updates: { isCooked } });
  };

  const isRecipeSaved = (recipeId: string) => {
    return savedRecipes.some((s) => s.recipeId === recipeId);
  };

  return {
    savedRecipes,
    isLoading,
    saveRecipe,
    unsaveRecipe,
    markAsCooked,
    isRecipeSaved,
    isSaving: saveRecipeMutation.isPending,
  };
}
