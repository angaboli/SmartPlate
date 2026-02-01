import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reviewRecipe } from '@/services/recipes.service';
import { handleApiError, AuthError, ValidationError } from '@/lib/errors';

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

    const { status, reviewNote } = body;
    if (status !== 'published' && status !== 'rejected') {
      throw new ValidationError(
        'status must be "published" or "rejected"',
      );
    }

    const recipe = await reviewRecipe(id, status, reviewNote, user);
    return NextResponse.json(recipe);
  } catch (error) {
    return handleApiError(error);
  }
}
