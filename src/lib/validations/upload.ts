import { z } from 'zod';

export const ALLOWED_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/avif', 'image/webp'] as const;

export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const MIME_EXTENSIONS: Record<(typeof ALLOWED_UPLOAD_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/avif': 'avif',
  'image/webp': 'webp',
};

export const presignUploadSchema = z.object({
  contentType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  // Declared file size in bytes — locked into the presigned PUT URL's
  // Content-Length so R2 rejects an upload that doesn't match, closing
  // the gap where size was previously only checked client-side.
  fileSize: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
  purpose: z.enum(['recipe-image', 'avatar']),
  // Optional: absent when uploading an image for a recipe that doesn't exist
  // yet (create flow) — present when editing an existing recipe's image.
  recipeId: z.string().optional(),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
