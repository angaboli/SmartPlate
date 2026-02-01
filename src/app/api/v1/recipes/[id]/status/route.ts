import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { changeRecipeStatus } from '@/services/recipes.service';
import { handleApiError, AuthError, ValidationError } from '@/lib/errors';
import type { RecipeStatus } from '@prisma/client';

const validStatuses: RecipeStatus[] = ['draft', 'pending_review', 'published', 'rejected'];

export async function PATCH(
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

    if (!body.status || !validStatuses.includes(body.status)) {
      throw new ValidationError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    const recipe = await changeRecipeStatus(id, body.status, user);
    return NextResponse.json(recipe);
  } catch (error) {
    return handleApiError(error);
  }
}
