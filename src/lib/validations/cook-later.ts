import { z } from 'zod';

export const saveCookLaterSchema = z.object({
  recipeId: z.string().min(1, 'recipeId is required'),
  tag: z.string().trim().max(50).nullable().optional(),
});

export const updateCookLaterSchema = z.object({
  tag: z.string().trim().max(50).nullable().optional(),
  isCooked: z.boolean().optional(),
});

export type SaveCookLaterInput = z.infer<typeof saveCookLaterSchema>;
export type UpdateCookLaterInput = z.infer<typeof updateCookLaterSchema>;
