import { NextRequest, NextResponse } from 'next/server';
import { refreshSchema } from '@/lib/validations/auth';
import { refresh } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = refreshSchema.parse(body);
    const tokens = await refresh(input.refreshToken);

    return NextResponse.json(tokens);
  } catch (error) {
    return handleApiError(error);
  }
}
