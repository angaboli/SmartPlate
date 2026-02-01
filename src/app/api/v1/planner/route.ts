import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentPlan } from '@/services/planner.service';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = await getCurrentPlan(user.sub);
    return NextResponse.json({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
