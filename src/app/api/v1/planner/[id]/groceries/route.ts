import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getGroceryListForPlan } from '@/services/planner.service';
import { handleApiError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const groceryList = await getGroceryListForPlan(user.sub, id);

    return NextResponse.json(groceryList);
  } catch (error) {
    return handleApiError(error);
  }
}
