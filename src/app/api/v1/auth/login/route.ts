import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/auth';
import { login } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';
import { checkRateLimit, recordAttempt, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    await checkRateLimit({
      identifier: ip,
      action: 'login',
      windowMs: 15 * 60 * 1000,
      maxAttempts: 10,
    });
    await recordAttempt(ip, 'login');

    const body = await request.json();
    const input = loginSchema.parse(body);
    const result = await login(input);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
