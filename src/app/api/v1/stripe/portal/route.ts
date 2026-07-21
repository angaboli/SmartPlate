import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createPortalSession } from '@/services/subscription.service';
import { handleApiError, AuthError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return handleApiError(new AuthError('Unauthorized'));
    }

    const session = await createPortalSession(user.sub);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return handleApiError(error);
  }
}
