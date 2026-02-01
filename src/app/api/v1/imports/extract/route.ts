import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { extractFromUrl, checkRateLimit } from '@/services/import.service';
import { handleApiError, AuthError, ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('url is required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    // Rate limit check
    await checkRateLimit(user.sub);

    // Extract recipe data (no DB write)
    const extracted = await extractFromUrl(url);

    return NextResponse.json(extracted);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}
