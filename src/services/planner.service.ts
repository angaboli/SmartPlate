import { db } from '@/lib/db';
import { AppError, NotFoundError } from '@/lib/errors';
import {
  generateWeeklyPlan,
  adjustWeeklyPlan,
  generateGroceryList,
  type UserNutritionContext,
  type GroceryListResult,
} from './ai.service';
import type { MealType } from '@prisma/client';

const PLAN_RATE_LIMIT = 5;

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─── Types ──────────────────────────────────────

interface ClientMeal {
  id: string;
  name: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface ClientDayPlan {
  date: string;
  day: string;
  dayIndex: number;
  meals: ClientMeal[];
}

export interface ClientMealPlan {
  id: string;
  weekStart: string;
  weekData: ClientDayPlan[];
}

// ─── Rate limiting (5 plans / day) ──────────────

export async function checkPlannerRateLimit(userId: string): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await db.mealPlan.count({
    where: {
      userId,
      createdAt: { gte: startOfDay },
    },
  });

  if (count >= PLAN_RATE_LIMIT) {
    throw new AppError('Daily plan generation limit reached (5/day). Try again tomorrow.', 429);
  }
}

// ─── Week start helper ──────────────────────────

export function getWeekStartDate(date?: Date): Date {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekStartForOffset(offset = 0): Date {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  return getWeekStartDate(now);
}

// ─── Get plan for week ──────────────────────────

export async function getPlan(userId: string, weekOffset = 0): Promise<ClientMealPlan | null> {
  const weekStart = getWeekStartForOffset(weekOffset);

  const plan = await db.mealPlan.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    include: {
      items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] },
    },
  });

  if (!plan) return null;

  return formatPlanForClient(plan);
}

// ─── Generate and save plan ─────────────────────

export async function generateAndSavePlan(userId: string, weekOffset = 0): Promise<ClientMealPlan> {
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
    language: settings?.language ?? 'en',
  };

  const aiResult = await generateWeeklyPlan(userContext);
  const weekStart = getWeekStartForOffset(weekOffset);

  // Transaction: delete existing plan for this week + create new one
  const plan = await db.$transaction(async (tx) => {
    await tx.mealPlan.deleteMany({
      where: { userId, weekStart },
    });

    return tx.mealPlan.create({
      data: {
        userId,
        weekStart,
        items: {
          create: aiResult.days.flatMap((day, dayIndex) =>
            day.meals.map((meal, mealIndex) => ({
              dayIndex,
              mealType: meal.type as MealType,
              name: meal.name,
              calories: meal.calories,
              sortOrder: mealIndex,
            })),
          ),
        },
      },
      include: {
        items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] },
      },
    });
  });

  return formatPlanForClient(plan);
}

// ─── Grocery list for plan ──────────────────────

export async function getGroceryListForPlan(
  userId: string,
  planId: string,
): Promise<GroceryListResult> {
  const plan = await db.mealPlan.findUnique({
    where: { id: planId },
    include: { items: true },
  });

  if (!plan) {
    throw new NotFoundError('Meal plan not found');
  }

  if (plan.userId !== userId) {
    throw new NotFoundError('Meal plan not found');
  }

  const mealNames = plan.items.map((item) => item.name);

  // Fetch user settings for dietary context
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
    language: settings?.language ?? 'en',
  };

  return generateGroceryList(mealNames, userContext);
}

// ─── Format plan for client ─────────────────────

export function formatPlanForClient(
  plan: {
    id: string;
    weekStart: Date;
    items: {
      id: string;
      dayIndex: number;
      mealType: string;
      name: string;
      calories: number;
      sortOrder: number;
    }[];
  },
): ClientMealPlan {
  const weekStart = new Date(plan.weekStart);

  const weekData: ClientDayPlan[] = Array.from({ length: 7 }, (_, dayIndex) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);

    const dayItems = plan.items.filter((item) => item.dayIndex === dayIndex);

    return {
      date: dayDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      day: DAY_NAMES[dayIndex],
      dayIndex,
      meals: dayItems.map((item) => ({
        id: item.id,
        name: item.name,
        calories: item.calories,
        type: item.mealType as ClientMeal['type'],
      })),
    };
  });

  return {
    id: plan.id,
    weekStart: weekStart.toISOString(),
    weekData,
  };
}

// ─── Get or create current plan ────────────────

export async function getOrCreatePlan(userId: string, weekOffset = 0) {
  const weekStart = getWeekStartForOffset(weekOffset);

  const plan = await db.mealPlan.upsert({
    where: { userId_weekStart: { userId, weekStart } },
    create: { userId, weekStart },
    update: {},
    include: {
      items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] },
    },
  });

  return plan;
}

// ─── Add meal to plan ──────────────────────────

export async function addMealToPlan(
  userId: string,
  data: { dayIndex: number; mealType: string; name: string; calories?: number },
  weekOffset = 0,
): Promise<ClientMealPlan> {
  const plan = await getOrCreatePlan(userId, weekOffset);

  const maxSort = await db.mealPlanItem.aggregate({
    where: { mealPlanId: plan.id, dayIndex: data.dayIndex },
    _max: { sortOrder: true },
  });

  await db.mealPlanItem.create({
    data: {
      mealPlanId: plan.id,
      dayIndex: data.dayIndex,
      mealType: data.mealType as MealType,
      name: data.name,
      calories: data.calories ?? 0,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  const updated = await db.mealPlan.findUniqueOrThrow({
    where: { id: plan.id },
    include: {
      items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] },
    },
  });

  return formatPlanForClient(updated);
}

// ─── Update meal item ──────────────────────────

export async function updateMealItem(
  userId: string,
  itemId: string,
  data: { name?: string; calories?: number; mealType?: string; dayIndex?: number },
): Promise<ClientMealPlan> {
  const item = await db.mealPlanItem.findUnique({
    where: { id: itemId },
    include: { mealPlan: { select: { userId: true, id: true } } },
  });

  if (!item || item.mealPlan.userId !== userId) {
    throw new NotFoundError('Meal item not found');
  }

  await db.mealPlanItem.update({
    where: { id: itemId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.calories !== undefined && { calories: data.calories }),
      ...(data.mealType !== undefined && { mealType: data.mealType as MealType }),
      ...(data.dayIndex !== undefined && { dayIndex: data.dayIndex }),
    },
  });

  const plan = await db.mealPlan.findUniqueOrThrow({
    where: { id: item.mealPlan.id },
    include: {
      items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] },
    },
  });

  return formatPlanForClient(plan);
}

// ─── Delete meal item ──────────────────────────

export async function deleteMealItem(
  userId: string,
  itemId: string,
): Promise<ClientMealPlan> {
  const item = await db.mealPlanItem.findUnique({
    where: { id: itemId },
    include: { mealPlan: { select: { userId: true, id: true } } },
  });

  if (!item || item.mealPlan.userId !== userId) {
    throw new NotFoundError('Meal item not found');
  }

  await db.mealPlanItem.delete({ where: { id: itemId } });

  const plan = await db.mealPlan.findUniqueOrThrow({
    where: { id: item.mealPlan.id },
    include: {
      items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] },
    },
  });

  return formatPlanForClient(plan);
}

// ─── Adjust plan with AI ───────────────────────

export async function adjustPlanWithAI(userId: string, weekOffset = 0): Promise<ClientMealPlan> {
  const plan = await getOrCreatePlan(userId, weekOffset);

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
    language: settings?.language ?? 'en',
  };

  const existingMeals = plan.items.map((item) => ({
    dayIndex: item.dayIndex,
    type: item.mealType,
    name: item.name,
    calories: item.calories,
  }));

  const aiResult = await adjustWeeklyPlan(existingMeals, userContext);

  // Replace items in a transaction
  const updated = await db.$transaction(async (tx) => {
    await tx.mealPlanItem.deleteMany({ where: { mealPlanId: plan.id } });

    await tx.mealPlanItem.createMany({
      data: aiResult.days.flatMap((day, dayIndex) =>
        day.meals.map((meal, mealIndex) => ({
          mealPlanId: plan.id,
          dayIndex,
          mealType: meal.type as MealType,
          name: meal.name,
          calories: meal.calories,
          sortOrder: mealIndex,
        })),
      ),
    });

    return tx.mealPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: {
        items: { orderBy: [{ dayIndex: 'asc' }, { sortOrder: 'asc' }] },
      },
    });
  });

  return formatPlanForClient(updated);
}
