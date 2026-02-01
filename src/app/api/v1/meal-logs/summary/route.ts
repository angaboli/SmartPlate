import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDailySummary } from '@/services/meal-log.service';
import { handleApiError, AuthError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const summary = await getDailySummary(user.sub);

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}
