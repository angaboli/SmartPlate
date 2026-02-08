'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

// ─── Types ──────────────────────────────────────────

export interface NutrientDTO {
  name: string;
  value: number;
  target: number;
  unit: string;
}

export interface AnalysisDataDTO {
  balance: 'excellent' | 'good' | 'needs-improvement';
  nutrients: NutrientDTO[];
  missing: string[];
  overconsumption: string[];
}

export interface SuggestionDTO {
  type: 'improve' | 'swap' | 'add';
  title: string;
  description: string;
}

export interface MealLogDTO {
  id: string;
  userId: string;
  mealText: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  analysis: {
    analysisData: AnalysisDataDTO;
    suggestions: SuggestionDTO[];
  };
  totalCalories: number;
  createdAt: string;
}

export interface WeeklyDataPoint {
  day: string;
  calories: number;
  target: number;
}

export interface DailySummaryDTO {
  today: {
    totalCalories: number;
    mealCount: number;
    calorieTarget: number;
  };
  weekDaysLogged: number;
  weeklyData: WeeklyDataPoint[];
}

// ─── Auth helpers ───────────────────────────────────

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const tokens = localStorage.getItem('auth');
  if (!tokens) return false;
  try {
    const { accessToken } = JSON.parse(tokens);
    return !!accessToken;
  } catch {
    return false;
  }
}

// ─── API functions ──────────────────────────────────

async function analyzeMealApi(data: {
  mealText: string;
  mealType: string;
}): Promise<MealLogDTO> {
  const res = await fetchWithAuth('/api/v1/meal-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(body.error || 'Daily analysis limit reached. Try again tomorrow.');
    }
    throw new Error(body.error || 'Failed to analyze meal');
  }
  return res.json();
}

async function fetchMealLogs(date?: string): Promise<MealLogDTO[]> {
  const params = date ? `?date=${date}` : '';
  const res = await fetchWithAuth(`/api/v1/meal-logs${params}`);
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch meal logs');
  }
  return res.json();
}

async function fetchDailySummary(): Promise<DailySummaryDTO> {
  const res = await fetchWithAuth('/api/v1/meal-logs/summary');
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch summary');
  }
  return res.json();
}

// ─── Hooks ──────────────────────────────────────────

export function useAnalyzeMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: analyzeMealApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-logs'] });
      queryClient.invalidateQueries({ queryKey: ['meal-summary'] });
    },
  });
}

export function useMealLogs(date?: string) {
  return useQuery({
    queryKey: ['meal-logs', date],
    queryFn: () => fetchMealLogs(date),
    enabled: isAuthenticated(),
  });
}

export function useDailySummary() {
  return useQuery({
    queryKey: ['meal-summary'],
    queryFn: fetchDailySummary,
    refetchInterval: 5 * 60 * 1000, // refetch every 5 min
    enabled: isAuthenticated(),
  });
}
