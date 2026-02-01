import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { updateMealItem, deleteMealItem } from '@/services/planner.service';
import { handleApiError } from '@/lib/errors';

const UpdateMealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  calories: z.number().int().min(0).max(10000).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  dayIndex: z.number().int().min(0).max(6).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await request.json();
    const data = UpdateMealSchema.parse(body);
    const plan = await updateMealItem(user.sub, itemId, data);

    return NextResponse.json({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const plan = await deleteMealItem(user.sub, itemId);

    return NextResponse.json({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
