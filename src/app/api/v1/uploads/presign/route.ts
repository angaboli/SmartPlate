import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { requireRole, canEditRecipe } from '@/lib/rbac';
import { getRecipeById } from '@/services/recipes.service';
import { getUploadUrl, getPublicUrl } from '@/lib/storage';
import { checkRateLimit, recordAttempt } from '@/lib/rate-limit';
import { handleApiError, AuthError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { presignUploadSchema, MIME_EXTENSIONS } from '@/lib/validations/upload';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) throw new AuthError('Unauthorized');

    const body = await request.json();
    const { contentType, fileSize, purpose, recipeId } = presignUploadSchema.parse(body);

    await checkRateLimit({
      identifier: user.sub,
      action: 'upload-presign',
      windowMs: 60 * 60 * 1000,
      maxAttempts: 30,
    });
    await recordAttempt(user.sub, 'upload-presign');

    const ext = MIME_EXTENSIONS[contentType];
    let key: string;

    if (purpose === 'recipe-image') {
      if (recipeId) {
        const recipe = await getRecipeById(recipeId, user);
        if (!recipe) throw new NotFoundError('Recipe not found');
        if (!canEditRecipe(user, recipe)) {
          throw new ForbiddenError('You do not have permission to upload an image for this recipe');
        }
        key = `recipes/${recipeId}/${randomUUID()}.${ext}`;
      } else {
        // No recipe yet (create flow) — only editor/admin can create recipes.
        requireRole(user, 'editor', 'admin');
        key = `recipes/pending/${user.sub}-${randomUUID()}.${ext}`;
      }
    } else {
      key = `avatars/${user.sub}/${randomUUID()}.${ext}`;
    }

    const uploadUrl = await getUploadUrl(key, contentType, fileSize);
    const publicUrl = getPublicUrl(key);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    return handleApiError(error);
  }
}
