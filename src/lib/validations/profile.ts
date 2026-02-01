import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  settings: z
    .object({
      language: z.enum(['en', 'fr']).optional(),
      goal: z.string().trim().optional(),
      age: z.number().int().min(1).max(150).nullable().optional(),
      weightKg: z.number().min(1).max(500).nullable().optional(),
      heightCm: z.number().min(30).max(300).nullable().optional(),
      activityLevel: z.string().trim().nullable().optional(),
      calorieTarget: z.number().int().min(500).max(10000).optional(),
      proteinTargetG: z.number().int().min(0).max(500).optional(),
      vegetarian: z.boolean().optional(),
      vegan: z.boolean().optional(),
      glutenFree: z.boolean().optional(),
      dairyFree: z.boolean().optional(),
      allergies: z.array(z.string().trim().max(100)).max(20).optional(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
