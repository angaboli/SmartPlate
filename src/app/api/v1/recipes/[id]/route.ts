import { NextRequest, NextResponse } from 'next/server';
import { getRecipeById } from '@/services/recipes.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recipe = await getRecipeById(id);

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(recipe);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 },
    );
  }
}
