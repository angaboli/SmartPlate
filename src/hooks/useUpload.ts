'use client';

import { useMutation } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from '@/lib/validations/upload';

export { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES };

interface UploadImageInput {
  file: File;
  purpose: 'recipe-image' | 'avatar';
  recipeId?: string;
}

async function uploadImage({ file, purpose, recipeId }: UploadImageInput): Promise<string> {
  if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Only JPEG, AVIF, and WebP images are allowed');
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error('Image must be smaller than 2MB');
  }

  const presignRes = await fetchWithAuth('/api/v1/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type, fileSize: file.size, purpose, recipeId }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to prepare upload');
  }
  const { uploadUrl, publicUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error('Failed to upload image');
  }

  return publicUrl;
}

export function useUploadImage() {
  return useMutation({
    mutationFn: uploadImage,
  });
}
