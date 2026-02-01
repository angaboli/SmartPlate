'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface SavedRecipeDTO {
  id: string;
  userId: string;
  recipeId: string;
  tag: string | null;
  isCooked: boolean;
  createdAt: string;
  recipe: {
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
    ingredients: { id: string; text: string; textFr: string | null; sortOrder: number }[];
    steps: { id: string; text: string; textFr: string | null; sortOrder: number }[];
  };
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const tokens = localStorage.getItem('auth');
  if (!tokens) return {};
  try {
    const { accessToken } = JSON.parse(tokens);
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  } catch {
    return {};
  }
}

async function fetchSavedRecipes(): Promise<SavedRecipeDTO[]> {
  const res = await fetch('/api/v1/cook-later', {
    headers: getAuthHeader(),
  });
  if (res.status === 401) return [];
  if (!res.ok) throw new Error('Failed to fetch saved recipes');
  return res.json();
}

async function saveRecipeApi(data: {
  recipeId: string;
  tag?: string;
}): Promise<SavedRecipeDTO> {
  const res = await fetch('/api/v1/cook-later', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save recipe');
  }
  return res.json();
}

async function unsaveRecipeApi(recipeId: string): Promise<void> {
  const res = await fetch(`/api/v1/cook-later/${recipeId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to unsave recipe');
}

async function updateSavedRecipeApi(data: {
  savedId: string;
  updates: { tag?: string | null; isCooked?: boolean };
}): Promise<SavedRecipeDTO> {
  const res = await fetch(`/api/v1/cook-later/${data.savedId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data.updates),
  });
  if (!res.ok) throw new Error('Failed to update saved recipe');
  return res.json();
}

export function useSavedRecipes() {
  return useQuery({
    queryKey: ['cook-later'],
    queryFn: fetchSavedRecipes,
  });
}

export function useSaveRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveRecipeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-later'] });
    },
  });
}

export function useUnsaveRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unsaveRecipeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-later'] });
    },
  });
}

export function useUpdateSavedRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSavedRecipeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-later'] });
    },
  });
}
