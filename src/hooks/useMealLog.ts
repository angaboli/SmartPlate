'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

// ─── Auth header helper ─────────────────────────────

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

// ─── API functions ──────────────────────────────────

async function analyzeMealApi(data: {
  mealText: string;
  mealType: string;
}): Promise<MealLogDTO> {
  const res = await fetch('/api/v1/meal-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
  const res = await fetch(`/api/v1/meal-logs${params}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch meal logs');
  }
  return res.json();
}

async function fetchDailySummary(): Promise<DailySummaryDTO> {
  const res = await fetch('/api/v1/meal-logs/summary', {
    headers: getAuthHeader(),
  });
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
  });
}

export function useDailySummary() {
  return useQuery({
    queryKey: ['meal-summary'],
    queryFn: fetchDailySummary,
    refetchInterval: 5 * 60 * 1000, // refetch every 5 min
  });
}
