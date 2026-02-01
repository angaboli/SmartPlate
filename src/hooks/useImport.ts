'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface ExtractedRecipeDTO {
  title: string;
  description: string | null;
  imageUrl: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  servings: number | null;
  ingredients: string[];
  steps: string[];
  provider: 'instagram' | 'tiktok' | 'youtube' | 'website';
  isPartial: boolean;
}

export interface SaveImportInput {
  url: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  servings?: number | null;
  calories?: number | null;
  ingredients: string[];
  steps: string[];
  tag?: string | null;
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

async function extractRecipeApi(url: string): Promise<ExtractedRecipeDTO> {
  const res = await fetch('/api/v1/imports/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(body.error || 'Rate limit exceeded. Try again later.');
    }
    throw new Error(body.error || 'Failed to extract recipe');
  }
  return res.json();
}

async function saveImportApi(data: SaveImportInput): Promise<unknown> {
  const res = await fetch('/api/v1/imports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(body.error || 'Rate limit exceeded. Try again later.');
    }
    throw new Error(body.error || 'Failed to save import');
  }
  return res.json();
}

export function useExtractRecipe() {
  return useMutation({
    mutationFn: extractRecipeApi,
  });
}

export function useSaveImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveImportApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-later'] });
    },
  });
}
