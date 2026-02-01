import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { extractFromUrl, checkRateLimit } from '@/services/import.service';
import { handleApiError, AuthError } from '@/lib/errors';
import { extractImportSchema } from '@/lib/validations/import';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { url } = extractImportSchema.parse(body);

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
