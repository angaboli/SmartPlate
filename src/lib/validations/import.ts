import { z } from 'zod';

export const extractImportSchema = z.object({
  url: z.string().url().max(2048),
});

export const saveImportSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  prepTimeMin: z.number().int().min(0).max(1440).nullable().optional(),
  cookTimeMin: z.number().int().min(0).max(1440).nullable().optional(),
  servings: z.number().int().min(1).max(100).nullable().optional(),
  calories: z.number().int().min(0).max(10000).nullable().optional(),
  ingredients: z.array(z.string().trim().max(500)).max(100),
  steps: z.array(z.string().trim().max(2000)).max(50),
  tag: z.string().trim().max(50).nullable().optional(),
});

export type ExtractImportInput = z.infer<typeof extractImportSchema>;
export type SaveImportInput = z.infer<typeof saveImportSchema>;
