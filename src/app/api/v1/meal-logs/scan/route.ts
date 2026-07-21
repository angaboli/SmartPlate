import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  checkAnalysisRateLimit,
  createMealLogFromPhoto,
} from '@/services/meal-log.service';
import { requireActiveSubscription } from '@/services/subscription.service';
import { handleApiError, AuthError } from '@/lib/errors';
import { scanMealPhotoSchema } from '@/lib/validations/meal-log';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { imageDataUrl, mealType } = scanMealPhotoSchema.parse(body);

    // AI Coach (tracking + planning) is a paid-only feature
    await requireActiveSubscription(user.sub);
    // Same daily quota as text-based analysis — vision calls are slower/
    // costlier, but a separate quota adds complexity not justified yet.
    await checkAnalysisRateLimit(user.sub);

    const mealLog = await createMealLogFromPhoto(user.sub, { imageDataUrl, mealType });

    return NextResponse.json(mealLog, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}
