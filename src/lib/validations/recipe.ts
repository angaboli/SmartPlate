import { z } from 'zod';

const mealTypeSchema = z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])).max(4);

export const createRecipeSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    titleFr: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    descriptionFr: z.string().trim().max(2000).optional(),
    imageUrl: z.string().url().max(2048).optional(),
    prepTimeMin: z.number().int().min(0).max(1440).optional(),
    cookTimeMin: z.number().int().min(0).max(1440).optional(),
    servings: z.number().int().min(1).max(100).optional(),
    calories: z.number().int().min(0).max(10000).optional(),
    category: z.string().trim().max(100).optional(),
    mealTypes: mealTypeSchema.optional(),
    goal: z.string().trim().max(100).optional(),
    ingredients: z
      .array(z.string().trim().max(500))
      .max(100)
      .optional(),
    ingredientsFr: z
      .array(z.string().trim().max(500))
      .max(100)
      .optional(),
    steps: z
      .array(z.string().trim().max(2000))
      .max(50)
      .optional(),
    stepsFr: z
      .array(z.string().trim().max(2000))
      .max(50)
      .optional(),
  })
  .refine((data) => data.title?.trim() || data.titleFr?.trim(), {
    message: 'At least one of title or titleFr is required',
  });

export const updateRecipeSchema = z.object({
  title: z.string().trim().max(200).optional(),
  titleFr: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  descriptionFr: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  prepTimeMin: z.number().int().min(0).max(1440).nullable().optional(),
  cookTimeMin: z.number().int().min(0).max(1440).nullable().optional(),
  servings: z.number().int().min(1).max(100).nullable().optional(),
  calories: z.number().int().min(0).max(10000).nullable().optional(),
  category: z.string().trim().max(100).optional(),
  mealTypes: mealTypeSchema.optional(),
  goal: z.string().trim().max(100).optional(),
  ingredients: z
    .array(z.string().trim().max(500))
    .max(100)
    .optional(),
  ingredientsFr: z
    .array(z.string().trim().max(500))
    .max(100)
    .optional(),
  steps: z
    .array(z.string().trim().max(2000))
    .max(50)
    .optional(),
  stepsFr: z
    .array(z.string().trim().max(2000))
    .max(50)
    .optional(),
});

export const reviewRecipeSchema = z.object({
  status: z.enum(['published', 'rejected']),
  reviewNote: z.string().trim().max(1000).optional(),
});

export const changeRecipeStatusSchema = z.object({
  status: z.enum(['draft', 'pending_review', 'published', 'rejected']),
});

export const setFeaturedSchema = z.object({
  featured: z.boolean(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ReviewRecipeInput = z.infer<typeof reviewRecipeSchema>;
export type ChangeRecipeStatusInput = z.infer<typeof changeRecipeStatusSchema>;
export type SetFeaturedInput = z.infer<typeof setFeaturedSchema>;
