import { NextRequest, NextResponse } from 'next/server';
import { listRecipes } from '@/services/recipes.service';

export async function GET(request: NextRequest) {
  try {
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
    };

    const recipes = await listRecipes(filters);

    return NextResponse.json(recipes);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 },
    );
  }
}
