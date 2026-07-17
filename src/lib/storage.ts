import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const PRESIGN_EXPIRY_SECONDS = 300;

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  // R2 doesn't support the AWS SDK v3's default request checksums
  // (x-amz-checksum-crc32 / x-amz-sdk-checksum-algorithm) — leaving this
  // on the default ('WHEN_SUPPORTED') breaks the presigned URL's
  // signature and R2 rejects the upload with a 403.
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

const BUCKET = process.env.R2_BUCKET_NAME || '';

export async function getUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(r2Client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
}

// Server-side direct upload (no presigned URL) — used when the server
// itself holds the bytes already, e.g. re-hosting a scraped import image.
// Client uploads go through getUploadUrl() instead so binaries never
// transit a Vercel serverless function.
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export function getPublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_R2_PUBLIC_URL is not configured');
  }
  return `${base.replace(/\/$/, '')}/${key}`;
}

export async function deleteObject(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
