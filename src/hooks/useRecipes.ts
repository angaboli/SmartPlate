'use client';

import { useQuery } from '@tanstack/react-query';
import type { RecipeFilters } from '@/services/recipes.service';

export interface RecipeDTO {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number | null;
  calories: number | null;
  category: string;
  goal: string | null;
  aiRecommended: boolean;
  isImported: boolean;
  sourceUrl: string | null;
  sourceProvider: string | null;
  ingredients: { id: string; text: string; sortOrder: number }[];
  steps: { id: string; text: string; sortOrder: number }[];
  createdAt: string;
  updatedAt: string;
}

async function fetchRecipes(filters: RecipeFilters): Promise<RecipeDTO[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.goal) params.set('goal', filters.goal);
  if (filters.aiRecommended !== undefined)
    params.set('aiRecommended', String(filters.aiRecommended));

  const qs = params.toString();
  const res = await fetch(`/api/v1/recipes${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
}

async function fetchRecipeById(id: string): Promise<RecipeDTO> {
  const res = await fetch(`/api/v1/recipes/${id}`);
  if (!res.ok) throw new Error('Failed to fetch recipe');
  return res.json();
}

export function useRecipes(filters: RecipeFilters = {}) {
  return useQuery({
    queryKey: ['recipes', filters],
    queryFn: () => fetchRecipes(filters),
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => fetchRecipeById(id),
    enabled: !!id,
  });
}
