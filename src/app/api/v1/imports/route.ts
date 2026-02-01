import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { saveImport, listImports, checkRateLimit } from '@/services/import.service';
import { handleApiError, AuthError } from '@/lib/errors';
import { saveImportSchema } from '@/lib/validations/import';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const data = saveImportSchema.parse(body);

    // Rate limit check
    await checkRateLimit(user.sub);

    const result = await saveImport(user.sub, {
      url: data.url,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      prepTimeMin: data.prepTimeMin ?? null,
      cookTimeMin: data.cookTimeMin ?? null,
      servings: data.servings ?? null,
      calories: data.calories ?? null,
      ingredients: data.ingredients,
      steps: data.steps,
      tag: data.tag ?? null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const imports = await listImports(user.sub);
    return NextResponse.json(imports);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return handleApiError(new AuthError('Unauthorized'));
    }
    return handleApiError(error);
  }
}
