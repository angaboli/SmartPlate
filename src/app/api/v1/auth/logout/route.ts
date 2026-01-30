import { NextRequest, NextResponse } from 'next/server';
import { refreshSchema } from '@/lib/validations/auth';
import { logout } from '@/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = refreshSchema.parse(body);
    await logout(input.refreshToken);

    return NextResponse.json({ message: 'Logged out' });
  } catch (error) {
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
