import { z } from 'zod';

export const saveCookLaterSchema = z.object({
  recipeId: z.string().min(1, 'recipeId is required'),
  tags: z.array(z.string().trim().max(50)).max(10).optional(),
});

export const updateCookLaterSchema = z.object({
  tags: z.array(z.string().trim().max(50)).max(10).optional(),
  isCooked: z.boolean().optional(),
});

export type SaveCookLaterInput = z.infer<typeof saveCookLaterSchema>;
export type UpdateCookLaterInput = z.infer<typeof updateCookLaterSchema>;
