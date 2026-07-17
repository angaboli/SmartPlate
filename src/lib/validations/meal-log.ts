import { z } from 'zod';

const mealTypeSchema = z
  .string()
  .transform((val) => val.toLowerCase())
  .transform((val) => (val === 'snacks' ? 'snack' : val))
  .pipe(z.enum(['breakfast', 'lunch', 'dinner', 'snack']));

export const createMealLogSchema = z.object({
  mealText: z.string().trim().min(1, 'mealText is required').max(2000),
  mealType: mealTypeSchema,
});

// data: URL, e.g. "data:image/jpeg;base64,/9j/4AAQ..." — generous ceiling
// on the encoded string itself (DoS guard); exact MIME whitelist and
// decoded byte size are enforced in meal-log.service.ts after decoding,
// since base64 inflates the raw image size by ~33%.
export const scanMealPhotoSchema = z.object({
  imageDataUrl: z.string().min(1).max(4_000_000),
  mealType: mealTypeSchema,
});

export type CreateMealLogInput = z.infer<typeof createMealLogSchema>;
export type ScanMealPhotoInput = z.infer<typeof scanMealPhotoSchema>;
