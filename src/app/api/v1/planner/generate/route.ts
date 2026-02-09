import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  checkPlannerRateLimit,
  generateAndSavePlan,
} from '@/services/planner.service';
import { handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const weekOffset = Math.max(-52, Math.min(52, parseInt(body.week, 10) || 0));

    await checkPlannerRateLimit(user.sub);
    const plan = await generateAndSavePlan(user.sub, weekOffset);

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
