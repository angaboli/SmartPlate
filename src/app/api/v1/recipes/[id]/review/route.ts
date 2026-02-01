import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reviewRecipe } from '@/services/recipes.service';
import { handleApiError, AuthError } from '@/lib/errors';
import { reviewRecipeSchema } from '@/lib/validations/recipe';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return handleApiError(new AuthError('Unauthorized'));
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reviewNote } = reviewRecipeSchema.parse(body);

    const recipe = await reviewRecipe(id, status, reviewNote, user);
    return NextResponse.json(recipe);
  } catch (error) {
    return handleApiError(error);
  }
}
