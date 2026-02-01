import { db } from '@/lib/db';
import { AppError, ValidationError } from '@/lib/errors';
import {
  extractRecipeFromUrl,
  type ExtractedRecipe,
} from './import-extractor';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ─── Rate limiting ──────────────────────────────────

export async function checkRateLimit(userId: string): Promise<void> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const count = await db['import'].count({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
  });

  if (count >= RATE_LIMIT_MAX) {
    throw new AppError('Rate limit exceeded. Try again later.', 429);
  }
}

// ─── Extract (no DB write) ──────────────────────────

export async function extractFromUrl(url: string): Promise<ExtractedRecipe> {
  return extractRecipeFromUrl(url);
}

// ─── Save imported recipe ───────────────────────────

export interface SaveImportInput {
  url: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  prepTimeMin?: number | null;
  cookTimeMin?: number | null;
  servings?: number | null;
  calories?: number | null;
  ingredients: string[];
  steps: string[];
  tag?: string | null;
}

export async function saveImport(userId: string, data: SaveImportInput) {
  if (!data.title.trim()) {
    throw new ValidationError('Title is required');
  }

  const provider = detectProvider(data.url);

  // Use a transaction to create Import + Recipe + SavedRecipe atomically
  return db.$transaction(async (tx) => {
    // Create the recipe (auto-published since it's a personal import)
    const recipe = await tx.recipe.create({
      data: {
        authorId: userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl || null,
        prepTimeMin: data.prepTimeMin ?? null,
        cookTimeMin: data.cookTimeMin ?? null,
        servings: data.servings ?? null,
        calories: data.calories ?? null,
        isImported: true,
        sourceUrl: data.url,
        sourceProvider: provider,
        status: 'published',
        publishedAt: new Date(),
        ingredients:
          data.ingredients.length > 0
            ? {
                create: data.ingredients.map((text, i) => ({
                  text: text.trim(),
                  sortOrder: i,
                })),
              }
            : undefined,
        steps:
          data.steps.length > 0
            ? {
                create: data.steps.map((text, i) => ({
                  text: text.trim(),
                  sortOrder: i,
                })),
              }
            : undefined,
      },
      include: {
        ingredients: { orderBy: { sortOrder: 'asc' } },
        steps: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Create the import audit record
    const importRecord = await tx['import'].create({
      data: {
        userId,
        url: data.url,
        provider,
        status: 'completed',
        extractedData: {
          title: data.title,
          ingredients: data.ingredients,
          steps: data.steps,
        },
        recipeId: recipe.id,
      },
    });

    // Auto-save to Cook Later
    const savedRecipe = await tx.savedRecipe.create({
      data: {
        userId,
        recipeId: recipe.id,
        tag: data.tag || null,
      },
      include: {
        recipe: {
          include: {
            ingredients: { orderBy: { sortOrder: 'asc' } },
            steps: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    return { import: importRecord, recipe, savedRecipe };
  });
}

// ─── List import history ────────────────────────────

export async function listImports(userId: string) {
  return db['import'].findMany({
    where: { userId },
    include: {
      recipe: {
        select: {
          id: true,
          title: true,
          imageUrl: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Helper ─────────────────────────────────────────

function detectProvider(
  url: string,
): 'instagram' | 'tiktok' | 'youtube' | 'website' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be'))
      return 'youtube';
    return 'website';
  } catch {
    return 'website';
  }
}
