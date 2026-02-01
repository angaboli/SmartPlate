import { z } from 'zod';

export const createMealLogSchema = z.object({
  mealText: z.string().trim().min(1, 'mealText is required').max(2000),
  mealType: z
    .string()
    .transform((val) => val.toLowerCase())
    .transform((val) => (val === 'snacks' ? 'snack' : val))
    .pipe(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])),
});

export type CreateMealLogInput = z.infer<typeof createMealLogSchema>;
