import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export interface RecipeFilters {
  search?: string;
  category?: string;
  goal?: string;
  aiRecommended?: boolean;
}

const recipeInclude = {
  ingredients: { orderBy: { sortOrder: 'asc' as const } },
  steps: { orderBy: { sortOrder: 'asc' as const } },
};

export async function listRecipes(filters: RecipeFilters = {}) {
  const where: Prisma.RecipeWhereInput = {};

  if (filters.search) {
    where.title = { contains: filters.search, mode: 'insensitive' };
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.goal) {
    where.goal = filters.goal;
  }

  if (filters.aiRecommended !== undefined) {
    where.aiRecommended = filters.aiRecommended;
  }

  return db.recipe.findMany({
    where,
    include: recipeInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getRecipeById(id: string) {
  return db.recipe.findUnique({
    where: { id },
    include: recipeInclude,
  });
}
