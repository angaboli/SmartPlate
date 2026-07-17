'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import type { RecipeFilters } from '@/services/recipes.service';

export interface RecipeDTO {
  id: string;
  title: string;
  titleFr: string | null;
  description: string | null;
  descriptionFr: string | null;
  imageUrl: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number | null;
  calories: number | null;
  category: string;
  mealTypes: string[];
  goal: string | null;
  aiRecommended: boolean;
  isImported: boolean;
  sourceUrl: string | null;
  sourceProvider: string | null;
  status: string;
  authorId: string | null;
  reviewNote: string | null;
  publishedAt: string | null;
  ingredients: { id: string; text: string; textFr: string | null; sortOrder: number }[];
  steps: { id: string; text: string; textFr: string | null; sortOrder: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipesPage {
  data: RecipeDTO[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchRecipes(
  filters: RecipeFilters,
  page: number,
  limit: number,
): Promise<RecipesPage> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.goal) params.set('goal', filters.goal);
  if (filters.aiRecommended !== undefined)
    params.set('aiRecommended', String(filters.aiRecommended));
  params.set('page', String(page));
  params.set('limit', String(limit));

  const res = await fetchWithAuth(`/api/v1/recipes?${params.toString()}`);
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
}

async function fetchRecipeById(id: string): Promise<RecipeDTO> {
  const res = await fetchWithAuth(`/api/v1/recipes/${id}`);
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch recipe');
  return res.json();
}

export function useRecipes(filters: RecipeFilters = {}, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['recipes', filters, page, limit],
    queryFn: () => fetchRecipes(filters, page, limit),
    placeholderData: (previous) => previous,
  });
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => fetchRecipeById(id),
    enabled: !!id,
  });
}

// ─── Mutations ──────────────────────────────────────

export interface RecipeInput {
  title: string;
  titleFr?: string;
  description?: string;
  descriptionFr?: string;
  imageUrl?: string;
  prepTimeMin?: number;
  cookTimeMin?: number;
  servings?: number;
  calories?: number;
  category?: string;
  mealTypes?: string[];
  goal?: string;
  ingredients?: string[];
  ingredientsFr?: string[];
  steps?: string[];
  stepsFr?: string[];
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: RecipeInput): Promise<RecipeDTO> => {
      const res = await fetchWithAuth('/api/v1/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create recipe');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: RecipeInput;
    }): Promise<RecipeDTO> => {
      const res = await fetchWithAuth(`/api/v1/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update recipe');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', variables.id] });
    },
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetchWithAuth(`/api/v1/recipes/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete recipe');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useChangeRecipeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }): Promise<RecipeDTO> => {
      const res = await fetchWithAuth(`/api/v1/recipes/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to change status');
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', variables.id] });
    },
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<RecipeDTO> => {
      const res = await fetchWithAuth(`/api/v1/recipes/${id}/submit`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit for review');
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', id] });
    },
  });
}
