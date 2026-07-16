import { z } from 'zod';

export const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const presignUploadSchema = z.object({
  contentType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  purpose: z.enum(['recipe-image', 'avatar']),
  // Optional: absent when uploading an image for a recipe that doesn't exist
  // yet (create flow) — present when editing an existing recipe's image.
  recipeId: z.string().optional(),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
