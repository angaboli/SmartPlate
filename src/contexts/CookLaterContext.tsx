'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addRecipe as addRecipeAction,
  removeRecipe as removeRecipeAction,
  updateRecipe as updateRecipeAction,
  markAsCooked as markAsCookedAction,
  selectSavedRecipes,
  type SavedRecipe,
  type RecipeSource,
  type RecipeTag,
} from '@/store/slices/cookLaterSlice';

export type { SavedRecipe, RecipeSource, RecipeTag };

export function useCookLater() {
  const dispatch = useAppDispatch();
  const savedRecipes = useAppSelector(selectSavedRecipes);

  const addRecipe = (recipe: Omit<SavedRecipe, 'id' | 'dateAdded'>) => {
    dispatch(addRecipeAction(recipe));
  };

  const removeRecipe = (id: string) => {
    dispatch(removeRecipeAction(id));
  };

  const updateRecipe = (id: string, updates: Partial<SavedRecipe>) => {
    dispatch(updateRecipeAction({ id, updates }));
  };

  const markAsCooked = (id: string, cooked: boolean) => {
    dispatch(markAsCookedAction({ id, cooked }));
  };

  return { savedRecipes, addRecipe, removeRecipe, updateRecipe, markAsCooked };
}
