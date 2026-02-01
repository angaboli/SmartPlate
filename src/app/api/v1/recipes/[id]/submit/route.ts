import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { submitForReview } from '@/services/recipes.service';
import { handleApiError, AuthError } from '@/lib/errors';

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
    const recipe = await submitForReview(id, user);
    return NextResponse.json(recipe);
  } catch (error) {
    return handleApiError(error);
  }
}
