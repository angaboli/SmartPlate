import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPlan } from '@/services/planner.service';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekParam = request.nextUrl.searchParams.get('week');
    const weekOffset = Math.max(-52, Math.min(52, parseInt(weekParam || '0', 10) || 0));

    const plan = await getPlan(user.sub, weekOffset);
    return NextResponse.json({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
