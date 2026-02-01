import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  checkAnalysisRateLimit,
  createMealLog,
  listMealLogs,
} from '@/services/meal-log.service';
import { handleApiError, AuthError, ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { mealText, mealType } = body;

    if (!mealText || typeof mealText !== 'string') {
      throw new ValidationError('mealText is required');
    }

    if (!mealType || typeof mealType !== 'string') {
      throw new ValidationError('mealType is required');
    }

    // Rate limit check
    await checkAnalysisRateLimit(user.sub);

    const mealLog = await createMealLog(user.sub, { mealText, mealType });

    return NextResponse.json(mealLog, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = request.nextUrl;
    const date = searchParams.get('date') || undefined;

    const logs = await listMealLogs(user.sub, { date });

    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}
