import { db } from '@/lib/db';
import { AppError, ValidationError } from '@/lib/errors';
import { analyzeMeal, type UserNutritionContext } from './ai.service';
import type { MealType } from '@prisma/client';

const RATE_LIMIT_MAX = 20;

// ─── Rate limiting (20 analyses / day) ──────────────

export async function checkAnalysisRateLimit(userId: string): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await db.mealLog.count({
    where: {
      userId,
      createdAt: { gte: startOfDay },
    },
  });

  if (count >= RATE_LIMIT_MAX) {
    throw new AppError('Daily analysis limit reached (20/day). Try again tomorrow.', 429);
  }
}

// ─── Input validation ───────────────────────────────

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export function validateMealInput(mealText: string, mealType: string): { text: string; type: MealType } {
  const trimmed = mealText.trim();

  if (!trimmed) {
    throw new ValidationError('Meal text is required');
  }

  if (trimmed.length > 2000) {
    throw new ValidationError('Meal text must be 2000 characters or less');
  }

  // Normalize 'snacks' → 'snack'
  let normalized = mealType.toLowerCase();
  if (normalized === 'snacks') {
    normalized = 'snack';
  }

  if (!VALID_MEAL_TYPES.includes(normalized as typeof VALID_MEAL_TYPES[number])) {
    throw new ValidationError(`Invalid meal type. Must be one of: ${VALID_MEAL_TYPES.join(', ')}`);
  }

  return { text: trimmed, type: normalized as MealType };
}

// ─── Create meal log (analyze + persist) ────────────

export async function createMealLog(
  userId: string,
  input: { mealText: string; mealType: string },
) {
  const { text, type } = validateMealInput(input.mealText, input.mealType);

  // Fetch user settings for AI context
  const settings = await db.userSettings.findUnique({
    where: { userId },
  });

  const userContext: UserNutritionContext = {
    calorieTarget: settings?.calorieTarget ?? 2000,
    proteinTargetG: settings?.proteinTargetG ?? 60,
    goal: settings?.goal ?? 'maintain',
    vegetarian: settings?.vegetarian ?? false,
    vegan: settings?.vegan ?? false,
    glutenFree: settings?.glutenFree ?? false,
    dairyFree: settings?.dairyFree ?? false,
    allergies: settings?.allergies ?? [],
  };

  // Call AI
  const result = await analyzeMeal(text, type, userContext);

  // Persist to DB
  const mealLog = await db.mealLog.create({
    data: {
      userId,
      mealText: text,
      mealType: type,
      analysis: {
        analysisData: result.analysisData,
        suggestions: result.suggestions,
      },
      totalCalories: result.totalCalories,
    },
  });

  return mealLog;
}

// ─── List meal logs ─────────────────────────────────

export async function listMealLogs(userId: string, options?: { date?: string }) {
  const where: { userId: string; createdAt?: { gte: Date; lt: Date } } = { userId };

  if (options?.date) {
    const date = new Date(options.date);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date format');
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startOfDay, lt: endOfDay };
  }

  return db.mealLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Daily summary ──────────────────────────────────

export async function getDailySummary(userId: string) {
  const now = new Date();

  // Today's start
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Week start (Monday)
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);

  // Get user settings for calorie target
  const settings = await db.userSettings.findUnique({
    where: { userId },
  });
  const calorieTarget = settings?.calorieTarget ?? 2000;

  // Today's meals
  const todayMeals = await db.mealLog.findMany({
    where: {
      userId,
      createdAt: { gte: todayStart },
    },
  });

  const todayCalories = todayMeals.reduce((sum, m) => sum + m.totalCalories, 0);

  // Week's meals (for days logged count + weekly chart data)
  const weekMeals = await db.mealLog.findMany({
    where: {
      userId,
      createdAt: { gte: weekStart },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Count unique days with logged meals this week
  const daysWithMeals = new Set(
    weekMeals.map((m) => m.createdAt.toISOString().slice(0, 10)),
  );

  // Build weekly data for chart (Mon-Sun)
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = dayNames.map((day, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    const dateStr = date.toISOString().slice(0, 10);

    const dayCalories = weekMeals
      .filter((m) => m.createdAt.toISOString().slice(0, 10) === dateStr)
      .reduce((sum, m) => sum + m.totalCalories, 0);

    return {
      day,
      calories: dayCalories,
      target: calorieTarget,
    };
  });

  return {
    today: {
      totalCalories: todayCalories,
      mealCount: todayMeals.length,
      calorieTarget,
    },
    weekDaysLogged: daysWithMeals.size,
    weeklyData,
  };
}
