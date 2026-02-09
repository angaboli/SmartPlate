'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

// ─── Types ──────────────────────────────────────

export interface Meal {
  id: string;
  name: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayPlan {
  date: string;
  day: string;
  dayIndex: number;
  meals: Meal[];
}

export interface MealPlanDTO {
  id: string;
  weekStart: string;
  weekData: DayPlan[];
}

export interface AddMealData {
  dayIndex: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories?: number;
}

export interface UpdateMealData {
  name?: string;
  calories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dayIndex?: number;
}

export interface GroceryItemDTO {
  name: string;
  quantity: string;
  category: string;
}

// ─── Auth helpers ───────────────────────────────

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const { accessToken } = JSON.parse(stored);
      return !!accessToken;
    }
  } catch {}
  return false;
}

// ─── API functions ──────────────────────────────

async function fetchMealPlan(weekOffset: number): Promise<MealPlanDTO | null> {
  const res = await fetchWithAuth(`/api/v1/planner?week=${weekOffset}`);
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch meal plan');
  }
  const data = await res.json();
  return data.plan ?? null;
}

async function generatePlanApi(weekOffset: number): Promise<MealPlanDTO> {
  const res = await fetchWithAuth('/api/v1/planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week: weekOffset }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(body.error || 'Daily plan generation limit reached. Try again tomorrow.');
    }
    throw new Error(body.error || 'Failed to generate meal plan');
  }
  const data = await res.json();
  return data.plan;
}

async function addMealApi(data: AddMealData & { week: number }): Promise<MealPlanDTO> {
  const res = await fetchWithAuth('/api/v1/planner/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to add meal');
  }
  const json = await res.json();
  return json.plan;
}

async function updateMealApi({ itemId, data }: { itemId: string; data: UpdateMealData }): Promise<MealPlanDTO> {
  const res = await fetchWithAuth(`/api/v1/planner/meals/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to update meal');
  }
  const json = await res.json();
  return json.plan;
}

async function deleteMealApi(itemId: string): Promise<MealPlanDTO> {
  const res = await fetchWithAuth(`/api/v1/planner/meals/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to delete meal');
  }
  const json = await res.json();
  return json.plan;
}

async function adjustPlanApi(weekOffset: number): Promise<MealPlanDTO> {
  const res = await fetchWithAuth('/api/v1/planner/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ week: weekOffset }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(body.error || 'Daily plan generation limit reached. Try again tomorrow.');
    }
    throw new Error(body.error || 'Failed to adjust plan');
  }
  const json = await res.json();
  return json.plan;
}

async function fetchGroceryList(planId: string): Promise<{ items: GroceryItemDTO[] }> {
  const res = await fetchWithAuth(`/api/v1/planner/${planId}/groceries`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch grocery list');
  }
  return res.json();
}

// ─── Hooks ──────────────────────────────────────

export function useMealPlan(weekOffset = 0) {
  return useQuery({
    queryKey: ['meal-plan', weekOffset],
    queryFn: () => fetchMealPlan(weekOffset),
    enabled: isAuthenticated(),
  });
}

export function useGeneratePlan(weekOffset = 0) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generatePlanApi(weekOffset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', weekOffset] });
    },
  });
}

export function useGroceryList(planId: string | null) {
  return useQuery({
    queryKey: ['grocery-list', planId],
    queryFn: () => fetchGroceryList(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAddMeal(weekOffset = 0) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddMealData) => addMealApi({ ...data, week: weekOffset }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', weekOffset] });
    },
  });
}

export function useUpdateMeal(weekOffset = 0) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMealApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', weekOffset] });
    },
  });
}

export function useDeleteMeal(weekOffset = 0) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMealApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', weekOffset] });
    },
  });
}

export function useAdjustPlan(weekOffset = 0) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adjustPlanApi(weekOffset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', weekOffset] });
    },
  });
}
