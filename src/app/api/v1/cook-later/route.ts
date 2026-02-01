import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listSavedRecipes, saveRecipe } from '@/services/cook-later.service';
import { handleApiError, AuthError } from '@/lib/errors';
import { saveCookLaterSchema } from '@/lib/validations/cook-later';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const saved = await listSavedRecipes(user.sub);
    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { recipeId, tag } = saveCookLaterSchema.parse(body);

    const saved = await saveRecipe(user.sub, recipeId, tag);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}
