import { db } from '@/lib/db';
import type { Prisma, RecipeStatus } from '@prisma/client';
import type { JwtPayload } from '@/lib/auth';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/errors';
import { canEditRecipe, canManagePublicationStatus } from '@/lib/rbac';

export interface RecipeFilters {
  search?: string;
  category?: string;
  goal?: string;
  aiRecommended?: boolean;
  status?: RecipeStatus;
}

const recipeInclude = {
  ingredients: { orderBy: { sortOrder: 'asc' as const } },
  steps: { orderBy: { sortOrder: 'asc' as const } },
};

// ─── List recipes ────────────────────────────────────

export async function listRecipes(
  filters: RecipeFilters = {},
  user?: JwtPayload | null,
) {
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

  // Status filtering based on role
  if (filters.status && user && (user.role === 'editor' || user.role === 'admin')) {
    where.status = filters.status;
  } else if (user && (user.role === 'editor' || user.role === 'admin')) {
    // Editors/admins see all statuses by default (no status filter)
  } else {
    // Public / regular users only see published recipes
    where.status = 'published';
  }

  return db.recipe.findMany({
    where,
    include: recipeInclude,
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Get recipe by ID ────────────────────────────────

export async function getRecipeById(id: string, user?: JwtPayload | null) {
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: recipeInclude,
  });

  if (!recipe) return null;

  // Published recipes are accessible to everyone
  if (recipe.status === 'published') return recipe;

  // Non-published: require auth + (author, editor, or admin)
  if (!user) return null;
  if (
    user.role === 'admin' ||
    user.role === 'editor' ||
    (recipe.authorId && recipe.authorId === user.sub)
  ) {
    return recipe;
  }

  return null;
}

// ─── Create recipe ───────────────────────────────────

export interface CreateRecipeInput {
  title: string;
  description?: string;
  imageUrl?: string;
  prepTimeMin?: number;
  cookTimeMin?: number;
  servings?: number;
  calories?: number;
  category?: string;
  goal?: string;
  ingredients?: string[];
  steps?: string[];
}

export async function createRecipe(data: CreateRecipeInput, authorId: string) {
  const { ingredients, steps, ...recipeData } = data;

  return db.recipe.create({
    data: {
      ...recipeData,
      authorId,
      status: 'draft',
      ingredients: ingredients
        ? {
            create: ingredients.map((text, i) => ({
              text,
              sortOrder: i,
            })),
          }
        : undefined,
      steps: steps
        ? {
            create: steps.map((text, i) => ({
              text,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: recipeInclude,
  });
}

// ─── Update recipe ───────────────────────────────────

export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  prepTimeMin?: number;
  cookTimeMin?: number;
  servings?: number;
  calories?: number;
  category?: string;
  goal?: string;
  ingredients?: string[];
  steps?: string[];
}

export async function updateRecipe(
  id: string,
  data: UpdateRecipeInput,
  user: JwtPayload,
) {
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) throw new NotFoundError('Recipe not found');

  if (!canEditRecipe(user, recipe)) {
    throw new ForbiddenError('You do not have permission to edit this recipe');
  }

  const { ingredients, steps, ...recipeData } = data;

  // If recipe was rejected, editing resets it to draft
  const status = recipe.status === 'rejected' ? 'draft' : recipe.status;

  // If ingredients or steps are provided, replace them
  if (ingredients) {
    await db.recipeIngredient.deleteMany({ where: { recipeId: id } });
  }
  if (steps) {
    await db.recipeStep.deleteMany({ where: { recipeId: id } });
  }

  return db.recipe.update({
    where: { id },
    data: {
      ...recipeData,
      status,
      reviewNote: recipe.status === 'rejected' ? null : recipe.reviewNote,
      ingredients: ingredients
        ? {
            create: ingredients.map((text, i) => ({
              text,
              sortOrder: i,
            })),
          }
        : undefined,
      steps: steps
        ? {
            create: steps.map((text, i) => ({
              text,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: recipeInclude,
  });
}

// ─── Submit for review ───────────────────────────────

export async function submitForReview(id: string, user: JwtPayload) {
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) throw new NotFoundError('Recipe not found');

  if (recipe.authorId !== user.sub) {
    throw new ForbiddenError('Only the author can submit for review');
  }

  if (recipe.status !== 'draft' && recipe.status !== 'rejected') {
    throw new ValidationError(
      `Cannot submit recipe with status "${recipe.status}" for review`,
    );
  }

  return db.recipe.update({
    where: { id },
    data: { status: 'pending_review', reviewNote: null },
    include: recipeInclude,
  });
}

// ─── Review recipe ───────────────────────────────────

export async function reviewRecipe(
  id: string,
  decision: 'published' | 'rejected',
  reviewNote: string | undefined,
  user: JwtPayload,
) {
  if (!canManagePublicationStatus(user)) {
    throw new ForbiddenError('Only editors and admins can review recipes');
  }

  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) throw new NotFoundError('Recipe not found');

  if (recipe.status !== 'pending_review') {
    throw new ValidationError(
      `Cannot review recipe with status "${recipe.status}"`,
    );
  }

  return db.recipe.update({
    where: { id },
    data: {
      status: decision,
      reviewNote: decision === 'rejected' ? reviewNote : null,
      publishedAt: decision === 'published' ? new Date() : null,
    },
    include: recipeInclude,
  });
}

// ─── Delete recipe ───────────────────────────────────

export async function deleteRecipe(id: string, user: JwtPayload) {
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) throw new NotFoundError('Recipe not found');

  if (!canEditRecipe(user, recipe)) {
    throw new ForbiddenError(
      'You do not have permission to delete this recipe',
    );
  }

  await db.recipe.delete({ where: { id } });
}
