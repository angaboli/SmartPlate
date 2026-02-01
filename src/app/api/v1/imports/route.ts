import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { saveImport, listImports, checkRateLimit } from '@/services/import.service';
import { handleApiError, AuthError, ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { url, title, description, imageUrl, prepTimeMin, cookTimeMin, servings, calories, ingredients, steps, tag } = body;

    if (!url || typeof url !== 'string') {
      throw new ValidationError('url is required');
    }

    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new ValidationError('title is required');
    }

    if (!Array.isArray(ingredients)) {
      throw new ValidationError('ingredients must be an array');
    }

    if (!Array.isArray(steps)) {
      throw new ValidationError('steps must be an array');
    }

    // Rate limit check
    await checkRateLimit(user.sub);

    const result = await saveImport(user.sub, {
      url,
      title,
      description: description || null,
      imageUrl: imageUrl || null,
      prepTimeMin: prepTimeMin != null ? Number(prepTimeMin) : null,
      cookTimeMin: cookTimeMin != null ? Number(cookTimeMin) : null,
      servings: servings != null ? Number(servings) : null,
      calories: calories != null ? Number(calories) : null,
      ingredients: ingredients.filter((i: unknown) => typeof i === 'string' && i.trim()),
      steps: steps.filter((s: unknown) => typeof s === 'string' && s.trim()),
      tag: tag || null,
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
