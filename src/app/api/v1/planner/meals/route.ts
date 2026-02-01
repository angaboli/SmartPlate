import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { addMealToPlan } from '@/services/planner.service';
import { handleApiError } from '@/lib/errors';

const AddMealSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  name: z.string().min(1).max(200),
  calories: z.number().int().min(0).max(10000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = AddMealSchema.parse(body);
    const plan = await addMealToPlan(user.sub, data);

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
