import { NextRequest, NextResponse } from 'next/server';
import { refreshSchema } from '@/lib/validations/auth';
import { refresh } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';
import { checkRateLimit, recordAttempt, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    await checkRateLimit({
      identifier: ip,
      action: 'refresh',
      windowMs: 60 * 60 * 1000,
      maxAttempts: 30,
    });
    await recordAttempt(ip, 'refresh');

    const body = await request.json();
    const input = refreshSchema.parse(body);
    const tokens = await refresh(input.refreshToken);

    return NextResponse.json(tokens);
  } catch (error) {
    return handleApiError(error);
  }
}
