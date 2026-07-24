import { db } from '@/lib/db';
import { AppError, ValidationError } from '@/lib/errors';
import {
  extractRecipeFromUrl,
  type ExtractedRecipe,
} from './import-extractor';
import { translateRecipeContent } from './ai.service';

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
  tags?: string[];
}

export async function saveImport(userId: string, data: SaveImportInput) {
  if (!data.title.trim()) {
    throw new ValidationError('Title is required');
  }

  const provider = detectProvider(data.url);

  // Detect the source language and backfill the other one (title/titleFr,
  // description/descriptionFr, per-item text/textFr) so the imported recipe
  // displays correctly for both EN and FR users via bi() — same bilingual
  // shape manually-authored recipes already have. Best-effort: on any
  // failure (timeout, rate limit, length mismatch), the recipe is still
  // saved with only the original language filled in, exactly as before this
  // feature existed.
  let title = data.title.trim();
  let description = data.description?.trim() || null;
  let ingredients = data.ingredients;
  let steps = data.steps;
  let titleFr: string | null = null;
  let descriptionFr: string | null = null;
  let ingredientsFr: (string | null)[] = data.ingredients.map(() => null);
  let stepsFr: (string | null)[] = data.steps.map(() => null);

  try {
    const translated = await translateRecipeContent({
      title,
      description,
      ingredients,
      steps,
    });

    const ingredientsMatch =
      translated.ingredientsEn.length === ingredients.length &&
      translated.ingredientsFr.length === ingredients.length;
    const stepsMatch =
      translated.stepsEn.length === steps.length &&
      translated.stepsFr.length === steps.length;

    if (translated.sourceLanguage === 'fr') {
      titleFr = title;
      title = translated.titleEn;
      descriptionFr = description;
      description = translated.descriptionEn;
      if (ingredientsMatch) {
        ingredientsFr = ingredients;
        ingredients = translated.ingredientsEn;
      }
      if (stepsMatch) {
        stepsFr = steps;
        steps = translated.stepsEn;
      }
    } else {
      titleFr = translated.titleFr;
      descriptionFr = translated.descriptionFr;
      if (ingredientsMatch) ingredientsFr = translated.ingredientsFr;
      if (stepsMatch) stepsFr = translated.stepsFr;
    }
  } catch {
    // Best-effort — leave Fr fields null, same as before this feature existed.
  }

  // Use a transaction to create Import + Recipe + SavedRecipe atomically
  return db.$transaction(async (tx) => {
    // Imports always go through review before publication — even for an
    // admin — the same as a manually-created recipe (see reviewRecipe() in
    // recipes.service.ts, which also bans the author from reviewing their
    // own submission). The SavedRecipe below still works for a
    // pending_review recipe: getRecipeById() lets the author view their own
    // unpublished recipe, so it shows up in the importer's Cook Later list
    // right away.
    const recipe = await tx.recipe.create({
      data: {
        authorId: userId,
        title: title.trim(),
        titleFr: titleFr?.trim() || null,
        description: description?.trim() || null,
        descriptionFr: descriptionFr?.trim() || null,
        imageUrl: data.imageUrl || null,
        prepTimeMin: data.prepTimeMin ?? null,
        cookTimeMin: data.cookTimeMin ?? null,
        servings: data.servings ?? null,
        calories: data.calories ?? null,
        isImported: true,
        sourceUrl: data.url,
        sourceProvider: provider,
        status: 'pending_review',
        publishedAt: null,
        ingredients:
          ingredients.length > 0
            ? {
                create: ingredients.map((text, i) => ({
                  text: text.trim(),
                  textFr: ingredientsFr[i]?.trim() || null,
                  sortOrder: i,
                })),
              }
            : undefined,
        steps:
          steps.length > 0
            ? {
                create: steps.map((text, i) => ({
                  text: text.trim(),
                  textFr: stepsFr[i]?.trim() || null,
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
        tags: data.tags ?? [],
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
