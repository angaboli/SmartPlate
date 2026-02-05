'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

function getAuthHeader(): Record<string, string> {
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const { accessToken } = JSON.parse(stored);
      if (accessToken) return { Authorization: `Bearer ${accessToken}` };
    }
  } catch {}
  return {};
}

async function fetchRecipes(filters: RecipeFilters): Promise<RecipeDTO[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.goal) params.set('goal', filters.goal);
  if (filters.aiRecommended !== undefined)
    params.set('aiRecommended', String(filters.aiRecommended));

  const qs = params.toString();
  const res = await fetch(`/api/v1/recipes${qs ? `?${qs}` : ''}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch recipes');
  }
  return res.json();
}

async function fetchRecipeById(id: string): Promise<RecipeDTO> {
  const res = await fetch(`/api/v1/recipes/${id}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to fetch recipe');
  }
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
      const res = await fetch('/api/v1/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      const res = await fetch(`/api/v1/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      const res = await fetch(`/api/v1/recipes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
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
      const res = await fetch(`/api/v1/recipes/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      const res = await fetch(`/api/v1/recipes/${id}/submit`, {
        method: 'POST',
        headers: getAuthHeader(),
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
