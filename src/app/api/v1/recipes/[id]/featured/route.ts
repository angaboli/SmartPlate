import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { setRecipeFeatured } from '@/services/recipes.service';
import { handleApiError, AuthError } from '@/lib/errors';
import { setFeaturedSchema } from '@/lib/validations/recipe';

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
    const { featured } = setFeaturedSchema.parse(body);

    const recipe = await setRecipeFeatured(id, featured, user);
    return NextResponse.json(recipe);
  } catch (error) {
    return handleApiError(error);
  }
}
