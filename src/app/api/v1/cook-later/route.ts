import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listSavedRecipes, saveRecipe } from '@/services/cook-later.service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const saved = await listSavedRecipes(user.sub);
    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/v1/cook-later]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { recipeId, tag } = body;

    if (!recipeId || typeof recipeId !== 'string') {
      return NextResponse.json(
        { error: 'recipeId is required' },
        { status: 400 },
      );
    }

    const saved = await saveRecipe(user.sub, recipeId, tag);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Prisma unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json(
        { error: 'Recipe already saved' },
        { status: 409 },
      );
    }
    console.error('[POST /api/v1/cook-later]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
