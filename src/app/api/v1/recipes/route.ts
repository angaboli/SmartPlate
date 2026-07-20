import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { listRecipes, createRecipe } from '@/services/recipes.service';
import { handleApiError } from '@/lib/errors';
import { createRecipeSchema } from '@/lib/validations/recipe';
import type { RecipeStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = request.nextUrl;

    const filters = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      goal: searchParams.get('goal') || undefined,
      aiRecommended:
        searchParams.get('aiRecommended') === 'true'
          ? true
          : searchParams.get('aiRecommended') === 'false'
            ? false
            : undefined,
      status: (searchParams.get('status') as RecipeStatus) || undefined,
      featured:
        searchParams.get('featured') === 'true'
          ? true
          : searchParams.get('featured') === 'false'
            ? false
            : undefined,
    };

    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

    const result = await listRecipes(filters, user, { page, limit });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    requireRole(user, 'editor', 'admin');

    const body = await request.json();
    const data = createRecipeSchema.parse(body);

    // DB column "title" is non-nullable — fall back to FR if EN is empty
    const title = data.title?.trim() || data.titleFr!.trim();

    const recipe = await createRecipe({ ...data, title }, user.sub);
    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
