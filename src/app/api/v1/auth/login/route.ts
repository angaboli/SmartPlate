import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth';
import { login, AuthError } from '@/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = loginSchema.parse(body);
    const result = await login(input);

    return NextResponse.json(result);
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
    console.error('[POST /api/v1/auth/login]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
