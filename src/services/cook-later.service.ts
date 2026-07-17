import { db } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

const savedRecipeInclude = {
  recipe: {
    include: {
      ingredients: { orderBy: { sortOrder: 'asc' as const } },
      steps: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
};

export async function listSavedRecipes(userId: string) {
  return db.savedRecipe.findMany({
    where: { userId },
    include: savedRecipeInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function saveRecipe(
  userId: string,
  recipeId: string,
  tags?: string[],
) {
  // Only published recipes can be saved
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { status: true },
  });

  if (!recipe || recipe.status !== 'published') {
    throw new NotFoundError('Recipe not found');
  }

  return db.savedRecipe.create({
    data: { userId, recipeId, tags: tags ?? [] },
    include: savedRecipeInclude,
  });
}

export async function unsaveRecipe(userId: string, recipeId: string) {
  return db.savedRecipe.delete({
    where: { userId_recipeId: { userId, recipeId } },
  });
}

export async function updateSavedRecipe(
  userId: string,
  savedId: string,
  updates: { tags?: string[]; isCooked?: boolean },
) {
  return db.savedRecipe.update({
    where: { id: savedId, userId },
    data: updates,
    include: savedRecipeInclude,
  });
}
