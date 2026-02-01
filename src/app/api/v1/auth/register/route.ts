import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth';
import { register } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';
import { checkRateLimit, recordAttempt, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    await checkRateLimit({
      identifier: ip,
      action: 'register',
      windowMs: 60 * 60 * 1000,
      maxAttempts: 5,
    });
    await recordAttempt(ip, 'register');

    const body = await request.json();
    const input = registerSchema.parse(body);
    const result = await register(input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
