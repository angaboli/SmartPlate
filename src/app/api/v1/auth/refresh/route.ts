import { NextRequest, NextResponse } from 'next/server';
import { refreshSchema } from '@/lib/validations/auth';
import { refresh, AuthError } from '@/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = refreshSchema.parse(body);
    const tokens = await refresh(input.refreshToken);

    return NextResponse.json(tokens);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: (error as any).issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
