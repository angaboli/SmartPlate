'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const { accessToken } = JSON.parse(stored);
      if (accessToken) return { Authorization: `Bearer ${accessToken}` };
    }
  } catch {}
  return {};
}

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

async function fetchMealPlan(): Promise<MealPlanDTO | null> {
  const res = await fetch('/api/v1/planner', {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch meal plan');
  }
  const data = await res.json();
  return data.plan ?? null;
}

async function generatePlanApi(): Promise<MealPlanDTO> {
  const res = await fetch('/api/v1/planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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

async function addMealApi(data: AddMealData): Promise<MealPlanDTO> {
  const res = await fetch('/api/v1/planner/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
  const res = await fetch(`/api/v1/planner/meals/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
  const res = await fetch(`/api/v1/planner/meals/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to delete meal');
  }
  const json = await res.json();
  return json.plan;
}

async function adjustPlanApi(): Promise<MealPlanDTO> {
  const res = await fetch('/api/v1/planner/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
  const res = await fetch(`/api/v1/planner/${planId}/groceries`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch grocery list');
  }
  return res.json();
}

// ─── Hooks ──────────────────────────────────────

export function useMealPlan() {
  return useQuery({
    queryKey: ['meal-plan'],
    queryFn: fetchMealPlan,
    enabled: isAuthenticated(),
  });
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generatePlanApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
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

export function useAddMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addMealApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
    },
  });
}

export function useUpdateMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMealApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
    },
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMealApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
    },
  });
}

export function useAdjustPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adjustPlanApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
    },
  });
}
