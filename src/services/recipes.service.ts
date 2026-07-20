import { db } from '@/lib/db';
import type { Prisma, RecipeStatus, MealType } from '@prisma/client';
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
  featured?: boolean;
}

// Keeps the homepage carousel readable — an editorial curation limit, not a
// technical one (see setRecipeFeatured below).
const MAX_FEATURED_RECIPES = 8;

export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const recipeInclude = {
  ingredients: { orderBy: { sortOrder: 'asc' as const } },
  steps: { orderBy: { sortOrder: 'asc' as const } },
};

// ─── List recipes ────────────────────────────────────

export async function listRecipes(
  filters: RecipeFilters = {},
  user?: JwtPayload | null,
  pagination: Pagination = { page: 1, limit: 20 },
): Promise<PaginatedResult<Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>>> {
  const where: Prisma.RecipeWhereInput = {};

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { titleFr: { contains: filters.search, mode: 'insensitive' } },
    ];
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

  if (filters.featured !== undefined) {
    where.featured = filters.featured;
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

  const { page, limit } = pagination;

  const [data, total] = await Promise.all([
    db.recipe.findMany({
      where,
      include: recipeInclude,
      // A curated carousel should follow the admin's chosen order, not
      // recency.
      orderBy: filters.featured === true ? { featuredOrder: 'asc' } : { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.recipe.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
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
  titleFr?: string;
  description?: string;
  descriptionFr?: string;
  imageUrl?: string;
  prepTimeMin?: number;
  cookTimeMin?: number;
  servings?: number;
  calories?: number;
  category?: string;
  mealTypes?: MealType[];
  goal?: string;
  ingredients?: string[];
  ingredientsFr?: string[];
  steps?: string[];
  stepsFr?: string[];
}

export async function createRecipe(data: CreateRecipeInput, authorId: string) {
  const { ingredients, ingredientsFr, steps, stepsFr, ...recipeData } = data;

  return db.recipe.create({
    data: {
      ...recipeData,
      authorId,
      status: 'draft',
      ingredients: ingredients
        ? {
            create: ingredients.map((text, i) => ({
              text,
              textFr: ingredientsFr?.[i] || null,
              sortOrder: i,
            })),
          }
        : undefined,
      steps: steps
        ? {
            create: steps.map((text, i) => ({
              text,
              textFr: stepsFr?.[i] || null,
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
  titleFr?: string;
  description?: string;
  descriptionFr?: string;
  imageUrl?: string | null;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  servings?: number | null;
  calories?: number | null;
  category?: string;
  mealTypes?: MealType[];
  goal?: string;
  ingredients?: string[];
  ingredientsFr?: string[];
  steps?: string[];
  stepsFr?: string[];
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

  const { ingredients, ingredientsFr, steps, stepsFr, ...recipeData } = data;

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
              textFr: ingredientsFr?.[i] || null,
              sortOrder: i,
            })),
          }
        : undefined,
      steps: steps
        ? {
            create: steps.map((text, i) => ({
              text,
              textFr: stepsFr?.[i] || null,
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

  // Applies regardless of how the recipe was created (RecipeForm or
  // import) — separation of duties: whoever submitted it can't also be
  // the one who approves it, even if they hold editor/admin rights.
  if (recipe.authorId === user.sub) {
    throw new ForbiddenError('Cannot review your own recipe');
  }

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

// ─── Change recipe status (editor/admin) ────────────

export async function changeRecipeStatus(
  id: string,
  newStatus: RecipeStatus,
  user: JwtPayload,
) {
  if (!canManagePublicationStatus(user)) {
    throw new ForbiddenError('Only editors and admins can change recipe status');
  }

  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) throw new NotFoundError('Recipe not found');

  return db.recipe.update({
    where: { id },
    data: {
      status: newStatus,
      publishedAt: newStatus === 'published' ? (recipe.publishedAt ?? new Date()) : null,
      reviewNote: newStatus === 'rejected' ? recipe.reviewNote : null,
    },
    include: recipeInclude,
  });
}

// ─── Feature recipe on the homepage carousel (editor/admin) ──

export async function setRecipeFeatured(
  id: string,
  featured: boolean,
  user: JwtPayload,
) {
  if (!canManagePublicationStatus(user)) {
    throw new ForbiddenError('Only editors and admins can feature a recipe');
  }

  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) throw new NotFoundError('Recipe not found');

  if (featured && !recipe.featured) {
    const count = await db.recipe.count({ where: { featured: true } });
    if (count >= MAX_FEATURED_RECIPES) {
      throw new ValidationError(
        `Cannot feature more than ${MAX_FEATURED_RECIPES} recipes at once`,
      );
    }
  }

  // New features are appended to the end of the curated order; un-featuring
  // clears it. No reordering UI in this first pass — an editor/admin who
  // wants a different order can un-feature and re-feature to move an item
  // to the end.
  let featuredOrder: number | null = null;
  if (featured) {
    if (recipe.featured) {
      featuredOrder = recipe.featuredOrder;
    } else {
      const { _max } = await db.recipe.aggregate({
        where: { featured: true },
        _max: { featuredOrder: true },
      });
      featuredOrder = (_max.featuredOrder ?? -1) + 1;
    }
  }

  return db.recipe.update({
    where: { id },
    data: { featured, featuredOrder },
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
